import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportsListClient } from "./_client";
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("revisão de colunas pela tela", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Confirmar importação" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    const confirmed = writes()[1]?.[1]?.body as FormData;
    expect(JSON.parse(String(confirmed.get("mapping")))).toEqual({ company_name: "Cliente" });
    expect(confirmed.get("enrich")).toBe("false");
    expect(
      screen.getByRole("link", { name: "Exportar contatos (CSV)" }).getAttribute("download"),
    ).not.toBeNull();
  });
});
