import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ImportDetailClient } from "./_client";
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const id = "76000000-0000-4000-8000-000000000001";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(admin = true, failReverse = false, failRead = false) {
  let reversed = false,
    first = true;
  const fetcher = vi.fn(async (url: unknown, opts?: RequestInit) => {
    if (String(url).endsWith("/history-reversal")) {
      if (failReverse && first) {
        first = false;
        throw new TypeError("Failed to fetch");
      }
      reversed = true;
      return {
        ok: true,
        json: async () => ({
          data: {
            batch_id: id,
            request_id: JSON.parse(String(opts?.body)).request_id,
            voided_services: 1,
            reversed_at: "2026-10-02T12:00:00Z",
            reused: false,
          },
        }),
      };
    }
    if (failRead)
      return {
        ok: false,
        json: async () => ({ error: { message: "Falha sintética de leitura" } }),
      };
    return {
      ok: true,
      json: async () => ({
        data: {
          batch: {
            filename: "synthetic.csv",
            status: "completed",
            successful_rows: 1,
            conflict_rows: 0,
            failed_rows: 0,
          },
          rows: [{ id, row_number: String(url).includes("after=50") ? 51 : 1, status: "success" }],
          receipt: {
            id,
            service_rows: 1,
            locations_created: 1,
            auxiliary_rows: 0,
            reversed_at: reversed ? "2026-10-02T12:00:00Z" : null,
          },
          can_reverse: admin && !reversed,
          next_after: String(url).includes("after=50") ? null : 50,
        },
      }),
    };
  });
  vi.stubGlobal("fetch", fetcher);
  render(<ImportDetailClient id={id} />);
  return fetcher;
}
it("admin confirma reversão e recebe estado fechado após recarregar lote", async () => {
  const f = setup();
  await screen.findByRole("button", { name: "Reverter lote" });
  expect(screen.getByRole("button", { name: "Reverter lote" })).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Confirmo a reversão deste lote."));
  fireEvent.click(screen.getByRole("button", { name: "Reverter lote" }));
  await screen.findByText("Lote revertido");
  expect(screen.queryByRole("button", { name: "Reverter lote" })).toBeNull();
  const call = f.mock.calls.find(([url]) => String(url).endsWith("/history-reversal"));
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({
    request_id: expect.stringMatching(/^[a-f0-9-]{36}$/),
    confirm: true,
  });
});
it("outros papéis veem recibo e paginação sem controle administrativo", async () => {
  const f = setup(false);
  await screen.findByText("synthetic.csv");
  expect(screen.queryByRole("button", { name: "Reverter lote" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
  await screen.findByText("51");
  expect(f.mock.calls.some(([url]) => String(url).includes("after=50"))).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
  await screen.findByText("1");
});
it("incerteza de rede conserva a chave da confirmação para retry", async () => {
  const f = setup(true, true);
  await screen.findByRole("button", { name: "Reverter lote" });
  fireEvent.click(screen.getByLabelText("Confirmo a reversão deste lote."));
  fireEvent.click(screen.getByRole("button", { name: "Reverter lote" }));
  await screen.findByText("Failed to fetch");
  fireEvent.click(screen.getByRole("button", { name: "Reverter lote" }));
  await screen.findByText("Lote revertido");
  const calls = f.mock.calls.filter(([url]) => String(url).endsWith("/history-reversal"));
  expect(calls).toHaveLength(2);
  expect(calls[0][1]?.body).toBe(calls[1][1]?.body);
});
it("falha na leitura oferece retry e não fica presa em carregando", async () => {
  setup(false, false, true);
  await screen.findByText("Falha sintética de leitura");
  expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
  expect(screen.queryByText("Carregando…")).toBeNull();
});
