// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { requireRole } from "@/lib/auth/require-role";
import { salvarArquivo, listarArquivos } from "@/lib/documentos/arquivos";
import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "./route";
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/documentos/previa-pdf", () => ({
  renderizarPrevia: vi.fn(async () => Buffer.from("%PDF-test")),
}));
vi.mock("@/lib/documentos/arquivos", () => ({
  salvarArquivo: vi.fn(),
  listarArquivos: vi.fn(),
  lerArquivo: vi.fn(),
}));
const id = "22222222-2222-4222-8222-222222222222";
const org = "11111111-1111-4111-8111-111111111111";
const body = {
  id,
  documento: {
    titulo: "Teste",
    destinatario: "Fictício",
    paginas: [{ texto: "Teste" }],
    assinaturas: [],
  },
};
function req(data: unknown = body, origin = "https://crm.test") {
  return new Request("https://crm.test/api/v1/documents/archive", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: org },
    org: { orgId: org, name: "Fictícia" },
  } as never);
  vi.mocked(salvarArquivo).mockResolvedValue({ id, repetido: false });
  vi.mocked(listarArquivos).mockResolvedValue({ documentos: [], proximoOffset: null });
});
it("nega sem admin e recusa organização injetada ou origem externa", async () => {
  expect((await POST(req(body, "https://outro.test"))).status).toBe(403);
  expect((await POST(req({ ...body, organization_id: org }))).status).toBe(422);
  vi.mocked(requireRole).mockResolvedValue({
    ok: false,
    response: new Response(null, { status: 403 }),
  } as never);
  expect((await POST(req())).status).toBe(403);
  expect(salvarArquivo).not.toHaveBeenCalled();
});
it("usa organização da sessão e resposta privada", async () => {
  const response = await POST(req());
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(salvarArquivo).toHaveBeenCalledWith(
    {},
    org,
    expect.objectContaining({ id, contactId: null }),
  );
});
it("não grava PDF para contato fora da organização ou anonimizado", async () => {
  const eq = vi.fn();
  const chain = {
    select: vi.fn(),
    eq,
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  chain.select.mockReturnValue(chain);
  eq.mockReturnValue(chain);
  vi.mocked(createClient).mockResolvedValue({ from: () => chain } as never);
  expect((await POST(req({ ...body, contact_id: id }))).status).toBe(404);
  expect(eq).toHaveBeenCalledWith("organization_id", org);
  expect(eq).toHaveBeenCalledWith("is_anonymized", false);
  expect(salvarArquivo).not.toHaveBeenCalled();
});
it("recusa consulta desconhecida ou parâmetros repetidos", async () => {
  expect(
    (await GET(new Request("https://crm.test/api/v1/documents/archive?offset=0&offset=1"))).status,
  ).toBe(422);
  expect(
    (await GET(new Request("https://crm.test/api/v1/documents/archive?organization_id=outro")))
      .status,
  ).toBe(422);
  expect(listarArquivos).not.toHaveBeenCalled();
});
