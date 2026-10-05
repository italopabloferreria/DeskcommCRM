import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArquivosDocumentos } from "@/app/app/documents/_arquivos";
import type { PreviaDocumento } from "@/lib/documentos/previa";
import { previaSchema } from "@/lib/documentos/previa";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
const doc: PreviaDocumento = {
  titulo: "Contrato",
  destinatario: "Cliente de teste",
  paginas: [{ texto: "Serviço de teste" }],
  assinaturas: [],
};
const contatoA = "11111111-1111-4111-8111-111111111111";
const contatoB = "22222222-2222-4222-8222-222222222222";
const fetchMock = vi.fn();
const respond = (data: unknown, ok = true) => ({
  ok,
  json: async () => (ok ? { data } : { error: { message: "Falha temporária" } }),
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url, init) =>
    init?.method === "POST" ? respond({}, false) : respond({ documentos: [], proximoOffset: null }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const posts = () =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([, init]) => JSON.parse(init.body));

describe("Arquivo preenchido no CRM", () => {
  it("orienta sobre destinatário ausente quando o preenchimento lança validação", async () => {
    render(<ArquivosDocumentos preparar={() => previaSchema.parse({ ...doc, destinatario: "" })} contatoId={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar PDF no CRM" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Informe o cliente ou destinatário.");
    expect(posts()).toHaveLength(0);
  });
  it("mantém o recibo após falha e muda o recibo ao selecionar outro contato", async () => {
    const { rerender } = render(<ArquivosDocumentos preparar={() => doc} contatoId={contatoA} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar PDF no CRM" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Salvar PDF no CRM" }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    await screen.findByRole("alert");
    expect(posts()[1].id).toBe(posts()[0].id);
    expect(posts()[0].contact_id).toBe(contatoA);
    rerender(<ArquivosDocumentos preparar={() => doc} contatoId={contatoB} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar PDF no CRM" }));
    await waitFor(() => expect(posts()).toHaveLength(3));
    expect(posts()[2].id).not.toBe(posts()[0].id);
    expect(posts()[2].contact_id).toBe(contatoB);
  });

  it("não envia PDF incompleto e permite abrir o editor sem preencher destinatário", async () => {
    render(<ArquivosDocumentos preparar={() => ({ ...doc, destinatario: "" })} contatoId={null} />);
    expect(screen.getByRole("heading", { name: "PDFs arquivados" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salvar PDF no CRM" }));
    await screen.findByRole("alert");
    expect(posts()).toHaveLength(0);
  });

  it("oferece somente download autenticado no mesmo domínio para o arquivo recebido", async () => {
    fetchMock.mockResolvedValue(
      respond({
        documentos: [
          {
            id: contatoA,
            titulo: "Contrato arquivado",
            destinatario: "Cliente fictício",
            criadoEm: "2026-10-04T12:00:00Z",
          },
        ],
        proximoOffset: null,
      }),
    );
    render(<ArquivosDocumentos preparar={() => doc} contatoId={null} />);
    const link = await screen.findByRole("link", { name: "Baixar PDF arquivado" });
    expect(link.getAttribute("href")).toBe(`/api/v1/documents/archive?id=${contatoA}`);
    expect(screen.getByText("Contrato arquivado")).toBeTruthy();
  });
});
