import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportsListClient } from "./_client";
import { importPreview } from "@/lib/crm-b2b/import-preview";
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("revisão de colunas pela tela", () => {
  it("exibe dados históricos originais e mantém a confirmação bloqueada", async () => {
    const preview = importPreview(
      {
        headers: ["Nome", "Endereço", "Valor", "Data/Atend.", "Observação"],
        rows: [["Cliente fictício", "Rua fictícia", "0", "45000", "Serviço fictício"]],
      },
      { person_name: "Nome" },
    );
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => ({
      ok: true,
      json: async () => ({ data: init ? preview : [] }),
    }));
    vi.stubGlobal("fetch", fetcher);
    const view = render(<ImportsListClient />);
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["Teste"], "demo.csv")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analisar planilha" }));
    await screen.findByRole("region", { name: "Locais e histórico de serviços" });
    expect(screen.getByText("Rua fictícia")).toBeTruthy();
    expect(screen.getByText("45000")).toBeTruthy();
    expect(screen.getByText("Serviço fictício")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Confirmar importação" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
  it("analisa antes de confirmar e envia a coluna escolhida pelo usuário", async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const form = init?.body as FormData | undefined;
      if (form?.get("preview") === "true")
        return {
          ok: true,
          json: async () => ({
            data: {
              headers: ["Cliente", "Responsável"],
              total_rows: 1,
              mapping: {},
              raw_sample: [["Empresa demo", "Pessoa demo"]],
              sample: [{}],
              column_coverage: [
                { header: "Cliente", populated_rows: 1 },
                { header: "Responsável", populated_rows: 1 },
              ],
            },
          }),
        };
      if (form)
        return {
          ok: true,
          json: async () => ({ data: { successful_rows: 1, conflict_rows: 0, failed_rows: 0 } }),
        };
      return { ok: true, json: async () => ({ data: [] }) };
    });
    vi.stubGlobal("fetch", fetcher);
    const view = render(<ImportsListClient />);
    const input = view.container.querySelector('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["Cliente;Responsável\nEmpresa demo;Pessoa demo"], "demo.csv")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analisar planilha" }));
    await screen.findByText(/Revise as colunas antes de importar/);
    const writes = () =>
      fetcher.mock.calls.filter((call) => (call[1]?.body as FormData | undefined)?.get("file"));
    expect(writes()).toHaveLength(1);
    expect((writes()[0]?.[1]?.body as FormData).get("preview")).toBe("true");
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "Cliente" } });
    expect(screen.getByText("Empresa demo")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Confirmar importação" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText(/Importação bloqueada/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Pessoa responsável"), {
      target: { value: "Responsável" },
    });
    expect(
      (screen.getByRole("button", { name: "Confirmar importação" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar importação" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    const confirmed = writes()[1]?.[1]?.body as FormData;
    expect(JSON.parse(String(confirmed.get("mapping")))).toEqual({
      company_name: "Cliente",
      person_name: "Responsável",
    });
    expect(confirmed.get("enrich")).toBe("false");
    expect(
      screen.getByRole("link", { name: "Exportar contatos (CSV)" }).getAttribute("download"),
    ).not.toBeNull();
  });
});
