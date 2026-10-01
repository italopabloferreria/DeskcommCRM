// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({
  requireSupportWrite: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/crm-b2b/import-process", () => ({ processCompaniesPeopleImport: vi.fn() }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => {
  const wrappers = await import("@/lib/api/wrappers");
  return {
    ...wrappers,
    requestIdOf: () => "test",
    seModuloB2bDesligado: vi.fn().mockResolvedValue(null),
    handleRouteError: (e: Error) => wrappers.fail("internal_error", e.message, 500),
  };
});
function request(csv: string, fields: Record<string, string>) {
  const form = new FormData();
  form.set("file", new File([csv], "demo.csv", { type: "text/csv" }));
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new NextRequest("http://localhost/api/v1/imports", { method: "POST", body: form });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    org: { orgId: "org", role: "manager" },
    user: { id: "user" },
  } as never);
});
describe("análise sem gravar", () => {
  it("mostra cabeçalhos desconhecidos sem acessar o banco", async () => {
    const response = await POST(
      request("Cliente;Responsável\nEmpresa teste;Pessoa teste", { preview: "true" }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.headers).toEqual(["Cliente", "Responsável"]);
    expect(json.data.raw_sample[0]).toEqual(["Empresa teste", "Pessoa teste"]);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("recusa confirmação sem campo identificador e sem gravar lote", async () => {
    const response = await POST(request("Cliente\nTeste", { mapping: "{}" }));
    expect(response.status).toBe(422);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("recusa colunas ausentes e cabeçalhos repetidos", async () => {
    expect(
      (
        await POST(
          request("Empresa\nTeste", { mapping: JSON.stringify({ company_name: "Inexistente" }) }),
        )
      ).status,
    ).toBe(422);
    expect((await POST(request("Nome;Nome\nA;B", { preview: "true" }))).status).toBe(422);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("recusa acesso sem permissão antes de ler a planilha", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    expect((await POST(request("Empresa\nTeste", { preview: "true" }))).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
});
