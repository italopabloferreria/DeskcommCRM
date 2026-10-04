import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ role: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.db }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => ({
  ...(await import("@/lib/api/wrappers")),
  requestIdOf: () => "test",
}));
import { GET } from "./route";
const id = "76000000-0000-5000-8000-000000000001";
const org = "76000000-0000-4000-8000-000000000002";
function run(query = "", contactId = id) {
  return GET(new NextRequest(`http://localhost/api/v1/contacts/${contactId}/workbook${query}`), {
    params: Promise.resolve({ id: contactId }),
  });
}
beforeEach(() => mocks.role.mockResolvedValue({ ok: true, org: { orgId: org } }));
afterEach(() => vi.resetAllMocks());
function database(contact: unknown, rows: unknown[] = [], error: unknown = null) {
  const c = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: contact, error: null }),
  };
  const r = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  const from = vi.fn((table: string) => (table === "contacts" ? c : r));
  mocks.db.mockResolvedValue({ from });
  return { c, r, from };
}
it("rejects invalid id/query before accessing data", async () => {
  expect((await run("", "bad")).status).toBe(422);
  expect((await run("?offset=-1")).status).toBe(422);
  expect((await run("?offset=1&offset=2")).status).toBe(422);
  expect(mocks.db).not.toHaveBeenCalled();
});
it("honors denied access", async () => {
  mocks.role.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
  expect((await run()).status).toBe(403);
  expect(mocks.db).not.toHaveBeenCalled();
});
it.each([null, { id, is_anonymized: true }])(
  "never queries source of inaccessible or anonymized contact",
  async (contact) => {
    const db = database(contact);
    expect((await run()).status).toBe(404);
    expect(db.from).toHaveBeenCalledTimes(1);
  },
);
it("scopes both reads by organization and source by exact contact with bounded pagination", async () => {
  const db = database(
    { id, is_anonymized: false },
    Array.from({ length: 51 }, (_, i) => ({ id: String(i), batch_id: id, raw_data: null })),
  );
  const response = await run("?offset=50");
  const body = await response.json();
  expect(db.c.eq).toHaveBeenCalledWith("organization_id", org);
  expect(db.r.eq).toHaveBeenCalledWith("organization_id", org);
  expect(db.r.eq).toHaveBeenCalledWith("contact_id", id);
  expect(db.r.range).toHaveBeenCalledWith(50, 100);
  expect(body.data.rows).toHaveLength(50);
  expect(body.data.next_offset).toBe(100);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("does not pretend a failed source read is empty", async () => {
  database({ id, is_anonymized: false }, [], { message: "private database error" });
  const response = await run();
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("private database error");
});
