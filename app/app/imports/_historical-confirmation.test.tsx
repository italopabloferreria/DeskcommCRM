import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HistoricalReviewEditor } from "./_historical-review";
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const id = "72000000-0000-4000-8000-000000000001",
  hash = "a".repeat(64);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(fail = false) {
  const fetcher = vi.fn(async (_url: unknown, options?: RequestInit) => {
    const form = options?.body as FormData;
    if (form?.get("historical_confirm") === "true") {
      if (fail) throw new Error("rede indisponível");
      return {
        ok: true,
        json: async () => ({
          data: {
            receipt_id: id,
            batch_id: id,
            total_rows: 1,
            service_rows: 0,
            locations_created: 0,
            auxiliary_rows: 1,
            reused: false,
          },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        data: {
          source_sha256: hash,
          historical_page: {
            page: 1,
            total_pages: 1,
            rows: [
              {
                data_row_index: 1,
                raw: {
                  name: "Auxiliar fictício",
                  address: "",
                  service_date: "",
                  value: "",
                  notes: "",
                },
              },
            ],
          },
          reviewed_draft: form?.get("historical_review")
            ? { ownership_verified: false, review_required_rows: 0 }
            : null,
        },
      }),
    };
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <HistoricalReviewEditor file={new File(["Id\nAuxiliar"], "synthetic.csv")} sourceHash={hash} />,
  );
  return fetcher;
}
async function review() {
  fireEvent.click(screen.getByRole("button", { name: "Abrir revisão por linhas" }));
  await screen.findByRole("button", { name: "Validar decisões sem gravar" });
  fireEvent.click(screen.getByRole("button", { name: "Validar decisões sem gravar" }));
  await screen.findByLabelText("Conferi os clientes e autorizo gravar este lote.");
}
it("confirma só após revisão e aceite, mostrando recibo e destino", async () => {
  const f = setup();
  await review();
  expect(screen.getByRole("button", { name: "Confirmar histórico" })).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Conferi os clientes e autorizo gravar este lote."));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar histórico" }));
  await screen.findByRole("link", { name: "Abrir lote confirmado" });
  const call = f.mock.calls.find(
    ([, o]) => (o?.body as FormData)?.get("historical_confirm") === "true",
  );
  const form = call?.[1]?.body as FormData;
  expect(form.get("preview")).toBeNull();
  expect(JSON.parse(String(form.get("historical_review"))).source_sha256).toBe(hash);
  expect(screen.getByRole("link", { name: "Abrir lote confirmado" })).toHaveAttribute(
    "href",
    "/app/imports/" + id,
  );
  expect(screen.queryByRole("button", { name: "Confirmar histórico" })).toBeNull();
});
it("falha de rede conserva decisões e permite conferir pelo reenvio", async () => {
  setup(true);
  await review();
  fireEvent.click(screen.getByLabelText("Conferi os clientes e autorizo gravar este lote."));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar histórico" }));
  await screen.findByText(
    "Não foi possível conferir o recibo. Reenvie o mesmo arquivo e as mesmas decisões.",
  );
  expect(screen.getByRole("button", { name: "Confirmar histórico" })).toBeEnabled();
});
