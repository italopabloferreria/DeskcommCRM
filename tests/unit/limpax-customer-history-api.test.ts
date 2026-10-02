import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/v1/customer-history/[kind]/[id]/route";
import { fail } from "@/lib/api/wrappers";
const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  role: vi.fn(),
  off: vi.fn(),
  support: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: h.role }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: h.support }));
vi.mock("@/lib/audit", () => ({ audit: h.audit }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: h.rpc }) }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => ({
  ...(await import("@/lib/api/wrappers")),
  requestIdOf: () => "test-history",
  seModuloB2bDesligado: h.off,
}));
const id = "3e000000-0000-4000-8000-000000000001",
  org = "3e000000-0000-4000-8000-000000000002";
const correct = {
  action: "correct",
  request_id: id,
  expected_version: 0,
  reason: "data_entry",
  patch: {
    service_date: null,
    value_cents: 0,
    currency: null,
    notes_current: "Corrigido",
    location_id: null,
  },
};
function ctx(kind = "service") {
  return { params: Promise.resolve({ kind, id }) };
}
function post(body: unknown = correct, origin: string | null = "https://crm.test") {
  return new Request("https://crm.test/api/v1/customer-history/service/" + id, {
    method: "POST",
    headers: origin
      ? { origin, "content-type": "application/json" }
      : { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function get(query = "") {
  return new Request("https://crm.test/api/v1/customer-history/person/" + id + query);
}
beforeEach(() => {
  vi.clearAllMocks();
  h.off.mockResolvedValue(null);
  h.support.mockResolvedValue(null);
  h.audit.mockResolvedValue(undefined);
  h.role.mockResolvedValue({ ok: true, org: { orgId: org, role: "admin" }, user: { id } });
  h.rpc.mockResolvedValue({ data: { available: true, items: [] }, error: null });
});
describe("API de gestão histórica", () => {
  it("módulo desligado não acessa função nem autorização", async () => {
    h.off.mockResolvedValue(fail("not_found", "Not found.", 404));
    expect((await GET(get(), ctx("person"))).status).toBe(404);
    expect((await POST(post(), ctx())).status).toBe(404);
    expect(h.role).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
  });
  it.each([null, "https://outro.test"])("barra origem %s antes de escrever", async (origin) => {
    expect((await POST(post(correct, origin), ctx())).status).toBe(403);
    expect(h.rpc).not.toHaveBeenCalled();
  });
  it("suporte somente leitura não pode alterar", async () => {
    h.support.mockResolvedValue(fail("forbidden", "Somente leitura", 403));
    expect((await POST(post(), ctx())).status).toBe(403);
    expect(h.rpc).not.toHaveBeenCalled();
  });
  it("recusa autoridade externa e recurso incompatível", async () => {
    expect((await POST(post({ ...correct, organization_id: org }), ctx())).status).toBe(422);
    expect((await POST(post(correct), ctx("person"))).status).toBe(422);
    expect(h.rpc).not.toHaveBeenCalled();
  });
  it("conta os bytes reais antes da RPC", async () => {
    expect(
      (
        await POST(
          post({ ...correct, patch: { ...correct.patch, notes_current: "x".repeat(66000) } }),
          ctx(),
        )
      ).status,
    ).toBe(413);
    expect(h.rpc).not.toHaveBeenCalled();
  });
  it("correção exige manager e usa exclusivamente a organização autenticada", async () => {
    expect((await POST(post(), ctx())).status).toBe(200);
    expect(h.role).toHaveBeenCalledWith("manager", expect.anything());
    expect(h.rpc).toHaveBeenCalledWith("fn_limpax_history_manage", {
      p_org: org,
      p_kind: "service",
      p_id: id,
      p_body: correct,
    });
    expect(h.audit).not.toHaveBeenCalled();
  });
  it.each([
    { action: "void", request_id: id, expected_version: 0, reason: "duplicate" },
    { action: "redact_person", request_id: id, confirm: true },
  ])("comando administrativo exige admin: $action", async (body) => {
    expect(
      (await POST(post(body), ctx(body.action === "redact_person" ? "person" : "service"))).status,
    ).toBe(200);
    expect(h.role).toHaveBeenCalledWith("admin", expect.anything());
  });
  it("negativa RBAC impede função", async () => {
    h.role.mockResolvedValue({ ok: false, response: fail("forbidden", "Não autorizado", 403) });
    expect((await POST(post(), ctx())).status).toBe(403);
    expect(h.rpc).not.toHaveBeenCalled();
  });
  it("conflito sanitiza conteúdo privado do banco", async () => {
    h.rpc.mockResolvedValue({
      data: null,
      error: { code: "PT409", message: "private original body" },
    });
    const response = await POST(post(), ctx());
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain("private original");
  });
  it("RPC ausente mostra indisponível na leitura e recusa escrita", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    const response = await GET(get(), ctx("person"));
    expect(response.status).toBe(200);
    expect((await response.json()).data.available).toBe(false);
    expect((await POST(post(), ctx())).status).toBe(409);
  });
  it("exportação direta exige admin e audita apenas escopo e IDs", async () => {
    h.rpc.mockResolvedValue({ data: { scope: "person_profile_and_history" }, error: null });
    const response = await GET(get("?export=person"), ctx("person"));
    expect(response.status).toBe(200);
    expect(h.role).toHaveBeenCalledWith("admin", expect.anything());
    expect(h.rpc).toHaveBeenCalledWith("fn_limpax_history_export_person", { p_org: org, p_id: id });
    expect(h.audit.mock.calls[0]?.[0].metadata).toEqual({ scope: "person_profile_and_history" });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it.each([
    "?after=nope",
    "?export=unknown",
    "?organization_id=" + org,
    "?after=" + id + "&after=" + org,
  ])("recusa query inválida %s", async (query) => {
    expect((await GET(get(query), ctx("person"))).status).toBe(422);
    expect(h.rpc).not.toHaveBeenCalled();
  });
  it("falha de tamanho na exportação nunca retorna parcial nem audita sucesso", async () => {
    h.rpc.mockResolvedValue({ data: { partial: true }, error: { code: "54000" } });
    const response = await GET(get("?export=person"), ctx("person"));
    expect(response.status).toBe(413);
    expect((await response.json()).data).toBeUndefined();
    expect(h.audit).not.toHaveBeenCalled();
  });
});
