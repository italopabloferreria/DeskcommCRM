// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/v1/imports/[id]/route";
const m = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: m.auth }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.create }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => ({
  ...(await import("@/lib/api/wrappers")),
  requestIdOf: () => "synthetic",
  seModuloB2bDesligado: async () => null,
}));
const id = "75000000-0000-4000-8000-000000000001",
  org = "75000000-0000-4000-8000-000000000002";
function query(result: unknown) {
  const q: { [k: string]: unknown } = {};
  for (const k of ["select", "eq", "gt", "order", "limit"]) q[k] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}
function run(search = "", batch = id) {
  return GET(new NextRequest("http://localhost/api/v1/imports/" + id + search), {
    params: Promise.resolve({ id: batch }),
  });
}
let batch: ReturnType<typeof query>,
  rows: ReturnType<typeof query>,
  receipt: ReturnType<typeof query>;
beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ ok: true, org: { orgId: org, role: "admin" } });
  batch = query({ data: { id, kind: "limpax_history" }, error: null });
  rows = query({
    data: Array.from({ length: 51 }, (_, n) => ({ id: String(n), row_number: n + 1 })),
    error: null,
  });
  receipt = query({ data: { id, reversed_at: null }, error: null });
  m.create.mockResolvedValue({
    from: vi.fn((t: string) =>
      t === "import_batches" ? batch : t === "import_rows" ? rows : receipt,
    ),
  });
});
it("pagina sem truncar silenciosamente e filtra org em todas as tabelas", async () => {
  const res = await run("?after=100");
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toContain("no-store");
  const body = (await res.json()).data;
  expect(body.rows).toHaveLength(50);
  expect(body.next_after).toBe(50);
  expect(body.can_reverse).toBe(true);
  for (const q of [batch, rows, receipt]) expect(q.eq).toHaveBeenCalledWith("organization_id", org);
  expect(rows.gt).toHaveBeenCalledWith("row_number", 100);
  expect(rows.limit).toHaveBeenCalledWith(51);
});
it.each(["?after=-1", "?status=madeup", "?after=0&after=1", "?organization_id=other"])(
  "consulta inválida %s não lê banco",
  async (search) => {
    expect((await run(search)).status).toBe(422);
    expect(m.create).not.toHaveBeenCalled();
  },
);
it("manager pode ler mas não recebe capacidade de reversão", async () => {
  m.auth.mockResolvedValue({ ok: true, org: { orgId: org, role: "manager" } });
  expect((await (await run()).json()).data.can_reverse).toBe(false);
});
it("falha nas linhas/recibo recusa resultado parcial", async () => {
  rows = query({ data: null, error: { message: "private detail" } });
  expect((await run()).status).toBe(500);
  rows = query({ data: [], error: null });
  receipt = query({ data: null, error: null });
  expect((await run()).status).toBe(500);
});
