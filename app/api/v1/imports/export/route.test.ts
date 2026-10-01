// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => {
  const wrappers = await import("@/lib/api/wrappers");
  return {
    ...wrappers,
    requestIdOf: () => "test",
    seModuloB2bDesligado: vi.fn().mockResolvedValue(null),
    handleRouteError: (e: Error) => wrappers.fail("internal_error", e.message, 500),
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    org: { orgId: "active-org" },
    user: { id: "user" },
  } as never);
});
function database(pages: Record<string, unknown>[][]) {
  let index = 0;
  const query: Record<string, unknown> = {};
  for (const key of ["select", "eq", "order", "is", "range"])
    query[key] = vi.fn().mockReturnValue(query);
  query.then = (resolve: (value: unknown) => unknown, reject: (err: unknown) => unknown) =>
    Promise.resolve({ data: pages[index++] ?? [], error: null }).then(resolve, reject);
  const from = vi.fn().mockReturnValue(query);
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { from, query };
}
describe("exportação privada", () => {
  it("pagina além de 500 linhas e limita à organização ativa", async () => {
    const { from, query } = database([
      Array.from({ length: 500 }, (_, i) => ({ id: String(i), trade_name: "Teste" })),
      [{ id: "501", trade_name: "Outra" }],
    ]);
    const res = await GET(new NextRequest("http://localhost/api/v1/imports/export?kind=companies"));
    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith("companies");
    expect(query.eq).toHaveBeenCalledWith("organization_id", "active-org");
    expect(query.range).toHaveBeenCalledWith(500, 999);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await res.text()).split("\r\n")).toHaveLength(503);
  });
  it("exclui contatos mesclados e grupos", async () => {
    const { query } = database([[]]);
    await GET(new NextRequest("http://localhost/api/v1/imports/export?kind=contacts"));
    expect(query.is).toHaveBeenCalledWith("is_merged_into", null);
    expect(query.eq).toHaveBeenCalledWith("kind", "person");
  });
  it("recusa tipo arbitrário sem acessar tabelas", async () => {
    expect(
      (await GET(new NextRequest("http://localhost/api/v1/imports/export?kind=__proto__"))).status,
    ).toBe(422);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("recusa usuário sem papel permitido", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    expect((await GET(new NextRequest("http://localhost/api/v1/imports/export"))).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
});
