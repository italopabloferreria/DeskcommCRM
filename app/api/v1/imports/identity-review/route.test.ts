import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ role: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.db }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => ({
  ...(await import("@/lib/api/wrappers")),
  requestIdOf: () => "review-test",
}));
import { GET } from "./route";
const org = "org-a";
const run = () => GET(new Request("http://localhost/api/v1/imports/identity-review"));
beforeEach(() => mocks.role.mockResolvedValue({ ok: true, org: { orgId: org } }));
afterEach(() => vi.resetAllMocks());
function database(pages: { data: unknown[] | null; error: unknown }[]) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const name of ["select", "eq", "is", "not", "order", "limit", "gt"])
    query[name] = vi.fn(() => query);
  query.then = vi.fn((resolve) =>
    Promise.resolve(pages.shift() ?? { data: [], error: null }).then(resolve),
  );
  mocks.db.mockResolvedValue({ from: vi.fn(() => query) });
  return query;
}
it("não consulta dados quando o acesso é negado", async () => {
  mocks.role.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
  expect((await run()).status).toBe(403);
  expect(mocks.db).not.toHaveBeenCalled();
});
it("lê além do limite de 1000 mantendo organização e cursor", async () => {
  const first = Array.from({ length: 1000 }, (_, i) => ({
    id: String(i),
    organization_id: org,
    source_metadata: null,
  }));
  const query = database([
    { data: first, error: null },
    { data: [], error: null },
  ]);
  const response = await run();
  expect((await response.json()).data.complete).toBe(true);
  expect(query.eq).toHaveBeenCalledWith("organization_id", org);
  expect(query.gt).toHaveBeenCalledWith("id", "999");
  expect(query.then).toHaveBeenCalledTimes(2);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("falha explicitamente se uma página intermediária falhar", async () => {
  database([
    { data: Array.from({ length: 1000 }, (_, i) => ({ id: String(i) })), error: null },
    { data: null, error: { message: "private error" } },
  ]);
  const response = await run();
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("private error");
});
it("sinaliza cobertura parcial ao atingir o teto", async () => {
  database(
    Array.from({ length: 10 }, () => ({
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        organization_id: org,
        source_metadata: null,
      })),
      error: null,
    })),
  );
  expect((await (await run()).json()).data.complete).toBe(false);
});
