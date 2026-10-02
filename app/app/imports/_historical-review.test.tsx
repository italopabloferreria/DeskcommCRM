import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoricalReviewEditor } from "./_historical-review";
import { historicalRowsForReview } from "@/lib/crm-b2b/historical-preview";
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));
const hash = "a".repeat(64),
  id = "11111111-1111-4111-8111-111111111111";
const file = new File(["Fictício"], "synthetic.csv");
const rows = historicalRowsForReview({
  headers: ["Nome", "Endereço", "Valor", "Data/Atend.", "Observação"],
  rows: Array.from({ length: 30 }, () => [
    "Cliente fictício",
    "Rua fictícia",
    "0",
    "01/01/2024",
    "Serviço fictício",
  ]),
}).rows;
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(stale = false) {
  const fetcher = vi.fn(async (url: unknown, options?: RequestInit) => {
    const form = options?.body as FormData | undefined;
    if (String(url).startsWith("/api/v1/companies"))
      return {
        ok: true,
        json: async () => ({
          data: [{ id, trade_name: "Empresa fictícia", cnpj: "00000000000000" }],
        }),
      };
    const page = Number(form?.get("historical_page") ?? 1);
    return {
      ok: true,
      json: async () => ({
        data: {
          source_sha256: stale ? "b".repeat(64) : hash,
          historical_page: { page, total_pages: 2, rows: [rows[page === 1 ? 0 : 25]] },
          reviewed_draft: form?.get("historical_review")
            ? { ownership_verified: false, review_required_rows: 29 }
            : null,
        },
      }),
    };
  });
  vi.stubGlobal("fetch", fetcher);
  render(<HistoricalReviewEditor file={file} sourceHash={hash} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir revisão por linhas" }));
  return fetcher;
}
async function choose() {
  await screen.findByLabelText("Cliente da linha 1");
  fireEvent.change(screen.getByLabelText("Buscar cliente"), { target: { value: "Empresa" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar cadastrados" }));
  await screen.findByRole("option", { name: "Empresa fictícia · 00000000000000" });
  fireEvent.change(screen.getByLabelText("Cliente da linha 1"), {
    target: { value: "company:" + id },
  });
}
describe("editor histórico sem gravação", () => {
  it("envia decisões explícitas apenas como prévia e conserva zero", async () => {
    const fetcher = setup();
    await choose();
    fireEvent.click(screen.getByLabelText("Aceito a data da linha 1"));
    fireEvent.click(screen.getByLabelText("Aceito o valor da linha 1"));
    fireEvent.click(screen.getByRole("button", { name: "Validar decisões sem gravar" }));
    await screen.findByText("29 linhas ainda precisam de revisão.");
    const call = fetcher.mock.calls.find(([, options]) =>
      (options?.body as FormData | undefined)?.get("historical_review"),
    );
    const form = call?.[1]?.body as FormData;
    expect(form.get("preview")).toBe("true");
    expect(JSON.parse(String(form.get("historical_review")))).toEqual({
      source_sha256: hash,
      decisions: [
        {
          data_row_index: 1,
          customer: { kind: "company", id },
          location: { kind: "create_from_original" },
          accept_original_date: true,
          accept_original_value: true,
        },
      ],
    });
    expect(screen.queryByRole("button", { name: "Confirmar importação" })).toBeNull();
  });
  it("conserva escolha ao ir à segunda página e voltar", async () => {
    setup();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    await screen.findByLabelText("Cliente da linha 26");
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    await screen.findByLabelText("Cliente da linha 1");
    expect((screen.getByLabelText("Cliente da linha 1") as HTMLSelectElement).value).toBe(
      "company:" + id,
    );
  });
  it("recusa resposta de outro arquivo e não oferece validar", async () => {
    setup(true);
    await screen.findByText("O arquivo mudou. Analise novamente.");
    expect(screen.queryByRole("button", { name: "Validar decisões sem gravar" })).toBeNull();
  });
});
