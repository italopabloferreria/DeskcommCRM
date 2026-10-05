import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ role: vi.fn(), db: vi.fn(), pool: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.db }));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: mocks.pool }));
vi.mock("@/lib/agent-engine/agent/request-deps", () => ({ requestTurnDeps: vi.fn() }));
vi.mock("@/lib/agent-engine/agent/reply-drafts", () => ({ generateReplyDraft: vi.fn() }));
import { GET } from "@/app/api/v1/conversations/[id]/draft-reply/route";
import { NextRequest } from "next/server";
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("retorna 503 explícito sem abrir pool quando o serviço não está configurado", async () => {
  vi.stubEnv("SUPABASE_DB_URL", "");
  mocks.role.mockResolvedValue({ ok: true, org: { orgId: "org" }, user: { idioma: "pt-BR" } });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: "conversation" } }),
  };
  mocks.db.mockResolvedValue({ from: vi.fn(() => query) });
  const response = await GET(
    new NextRequest("http://localhost/api/v1/conversations/conversation/draft-reply"),
    { params: Promise.resolve({ id: "conversation" }) },
  );
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("service_unavailable");
  expect(mocks.pool).not.toHaveBeenCalled();
  expect(query.eq).toHaveBeenCalledWith("organization_id", "org");
});
it("não expõe configuração nem consulta pool a quem não tem acesso", async () => {
  mocks.role.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
  expect(
    (
      await GET(new NextRequest("http://localhost/api/v1/conversations/x/draft-reply"), {
        params: Promise.resolve({ id: "x" }),
      })
    ).status,
  ).toBe(403);
  expect(mocks.db).not.toHaveBeenCalled();
  expect(mocks.pool).not.toHaveBeenCalled();
});
