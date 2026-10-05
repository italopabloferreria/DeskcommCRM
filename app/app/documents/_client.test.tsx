import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentsClient } from "./_client";

// Esta suíte mede modelos e imagens. O arquivo privado tem sua própria suíte;
// sua consulta inicial não deve consumir os mocks sequenciais dos modelos.
vi.mock("./_arquivos", () => ({ ArquivosDocumentos: () => null }));

afterEach(() => vi.unstubAllGlobals());
describe("documentos com imagens manuais", () => {
  it("oferece download da prévia pronta e retira o link quando o conteúdo muda", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:previa-teste", revokeObjectURL: revoke });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["%PDF-teste"]) }));
    const { unmount } = render(<DocumentsClient podeUsarPng={false} />);
    fireEvent.change(screen.getByLabelText("Cliente ou destinatário"), { target: { value: "Cliente fictício" } });
    fireEvent.change(screen.getByLabelText("Texto da página 1"), { target: { value: "Conteúdo fictício." } });
    fireEvent.click(screen.getByRole("button", { name: "Baixar prévia em PDF" }));
    const link = await screen.findByRole("button", { name: "Baixar PDF gerado" });
    expect(link.closest("form")?.getAttribute("action")).toBe("/api/v1/documents/preview");
    expect(link.closest("form")?.getAttribute("method")).toBe("post");
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Documento alterado" } });
    expect(screen.queryByRole("button", { name: "Baixar PDF gerado" })).toBeNull();
    unmount();
    expect(revoke).toHaveBeenCalledWith("blob:previa-teste");
  });
  it("preenche destinatário vazio pelo campo de cliente e preserva destinatário informado", () => {
    render(<DocumentsClient podeUsarPng />);
    fireEvent.change(screen.getByLabelText("Nome do cliente"), { target: { value: "Cliente fictício" } });
    expect((screen.getByLabelText("Cliente ou destinatário") as HTMLInputElement).value).toBe("{{cliente.nome}}");
    fireEvent.change(screen.getByLabelText("Cliente ou destinatário"), { target: { value: "Destinatário específico" } });
    fireEvent.change(screen.getByLabelText("Nome do cliente"), { target: { value: "Outro cliente fictício" } });
    expect((screen.getByLabelText("Cliente ou destinatário") as HTMLInputElement).value).toBe("Destinatário específico");
  });
  it("salva texto e imagens e restaura a versão escolhida", async () => {
    const model = {
      id: "22222222-2222-4222-8222-222222222222",
      nome: "Modelo teste",
      documento: {
        titulo: "Contrato carregado",
        destinatario: "{{cliente.nome}}",
        paginas: [{ texto: "Cláusula carregada" }],
        assinaturas: [],
      },
      origem: null,
    };
    const versao = {
      id: model.id,
      versao: "a".repeat(64),
      nome: model.nome,
      criadoEm: "2026-10-01T12:00:00Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: model.id } }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { modelos: [versao], proximoOffset: null } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: model }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentsClient podeUsarPng />);
    fireEvent.change(screen.getByLabelText("Cliente ou destinatário"), {
      target: { value: "{{cliente.nome}}" },
    });
    fireEvent.change(screen.getByLabelText("Nome do modelo"), {
      target: { value: "Modelo teste" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo e imagens" }));
    const load = await screen.findByRole("button", { name: /Modelo teste ·/ });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).documento.destinatario).toBe(
      "{{cliente.nome}}",
    );
    fireEvent.click(load);
    await waitFor(() =>
      expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe(
        "Contrato carregado",
      ),
    );
    expect((screen.getByLabelText("Texto da página 1") as HTMLTextAreaElement).value).toBe(
      "Cláusula carregada",
    );
  });
  it("mantém assinatura e carimbo separados e permite retirar apenas um", async () => {
    render(<DocumentsClient podeUsarPng />);
    const arquivo = new File([new Uint8Array([137, 80, 78, 71])], "teste.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByLabelText("PNG de assinatura"), { target: { files: [arquivo] } });
    fireEvent.change(screen.getByLabelText("PNG de carimbo"), { target: { files: [arquivo] } });
    await waitFor(() => expect(screen.getByAltText("Prévia de assinatura")).toBeTruthy());
    await waitFor(() => expect(screen.getByAltText("Prévia de carimbo")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Retirar assinatura" }));
    expect(screen.queryByAltText("Prévia de assinatura")).toBeNull();
    expect(screen.getByAltText("Prévia de carimbo")).toBeTruthy();
  });
  it("não mantém imagem anterior ao escolher arquivo inválido", async () => {
    render(<DocumentsClient podeUsarPng />);
    const input = screen.getByLabelText("PNG de carimbo");
    fireEvent.change(input, {
      target: { files: [new File(["a"], "a.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(screen.getByAltText("Prévia de carimbo")).toBeTruthy());
    fireEvent.change(input, {
      target: { files: [new File(["a"], "a.jpg", { type: "image/jpeg" })] },
    });
    expect(screen.queryByAltText("Prévia de carimbo")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Use PNG");
  });
  it("não oferece imagens para papel sem permissão e não gera PDF inválido", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentsClient podeUsarPng={false} />);
    expect(screen.queryByLabelText("PNG de carimbo")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Baixar prévia em PDF" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
