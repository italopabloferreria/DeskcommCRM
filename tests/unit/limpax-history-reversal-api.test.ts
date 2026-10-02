// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/imports/[id]/history-reversal/route";
const m = vi.hoisted(() => ({ rpc: vi.fn(), auth: vi.fn(), support: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: m.auth }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: m.support }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.create }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => ({
  ...(await import("@/lib/api/wrappers")),
  requestIdOf: () => "synthetic",
  seModuloB2bDesligado: async () => null,
}));
const id = "74000000-0000-4000-8000-000000000001",
  org = "74000000-0000-4000-8000-000000000002";
const receipt = {
  batch_id: id,
  request_id: org,
  voided_services: 1,
  reversed_at: "2026-10-02T12:00:00Z",
  reused: false,
};
function run(
  body: unknown = { request_id: org, confirm: true },
  origin = "http://localhost",
  batch = id,
) {
  return POST(
    new Request("http://localhost/api/v1/imports/" + id + "/history-reversal", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: batch }) },
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ ok: true, org: { orgId: org, role: "admin" } });
  m.support.mockResolvedValue(null);
  m.create.mockResolvedValue({ rpc: m.rpc });
  m.rpc.mockResolvedValue({ data: receipt, error: null });
});
it("exige admin e envia apenas org confiável, lote e confirmação validada", async () => {
  const res = await run();
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toContain("no-store");
  expect(m.auth).toHaveBeenCalledWith("admin", expect.any(Object));
  expect(m.rpc).toHaveBeenCalledTimes(1);
  expect(m.rpc).toHaveBeenCalledWith("fn_limpax_history_reverse_batch", {
    p_org: org,
    p_batch: id,
    p_body: { request_id: org, confirm: true },
  });
});
it.each([
  { confirm: true },
  { request_id: org, confirm: false },
  { request_id: org, confirm: true, organization_id: org },
])("recusa confirmação incompleta ou campos extras", async (body) => {
  expect((await run(body)).status).toBe(422);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("bloqueia origem, suporte e papel antes da escrita", async () => {
  expect((await run(undefined, "https://evil.invalid")).status).toBe(403);
  m.support.mockResolvedValue(new Response(null, { status: 403 }));
  expect((await run()).status).toBe(403);
  m.support.mockResolvedValue(null);
  m.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
  expect((await run()).status).toBe(403);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("recusa UUID inválido", async () => {
  expect((await run(undefined, "http://localhost", "wrong")).status).toBe(422);
  expect(m.rpc).not.toHaveBeenCalled();
});
it.each([
  ["PGRST202", 409],
  ["PT409", 409],
  ["P0002", 404],
  ["42501", 403],
  ["XX000", 500],
])("falha %s fica sanitizada", async (code, status) => {
  m.rpc.mockResolvedValue({ data: null, error: { code, message: "private details" } });
  const res = await run();
  expect(res.status).toBe(status);
  expect(JSON.stringify(await res.json())).not.toContain("private details");
});
it("recusa resultado inválido sem fingir que o lote foi revertido", async () => {
  m.rpc.mockResolvedValue({ data: {}, error: null });
  expect((await run()).status).toBe(500);
});
