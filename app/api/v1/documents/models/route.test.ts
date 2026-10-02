// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { requireRole } from "@/lib/auth/require-role";
import { salvarModelo, listarModelos } from "@/lib/documentos/acervo";
import { GET, POST } from "./route";
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/documentos/acervo", () => ({
  salvarModelo: vi.fn(),
  listarModelos: vi.fn(),
  lerModelo: vi.fn(),
}));
const modelo = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Teste",
  documento: {
    titulo: "Teste",
    destinatario: "Cliente",
    paginas: [{ texto: "Teste" }],
    assinaturas: [],
  },
  origem: null,
};
const req = (body: unknown = modelo, origin = "https://crm.test") =>
  new Request("https://crm.test/api/v1/documents/models", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: "ator" },
    org: { orgId: "org-autorizada" },
  } as never);
  vi.mocked(salvarModelo).mockResolvedValue({
    id: modelo.id,
    versao: "a".repeat(64),
    repetido: false,
  });
  vi.mocked(listarModelos).mockResolvedValue({ modelos: [], proximoOffset: null });
});
it("nega acesso sem administrador", async () => {
  vi.mocked(requireRole).mockResolvedValue({
    ok: false,
    response: new Response(null, { status: 403 }),
  } as never);
  expect((await POST(req())).status).toBe(403);
  expect(salvarModelo).not.toHaveBeenCalled();
});
it("recusa origem externa e organização injetada", async () => {
  expect((await POST(req(modelo, "https://outro.test"))).status).toBe(403);
  expect((await POST(req({ ...modelo, organization_id: "outra" }))).status).toBe(422);
  expect(salvarModelo).not.toHaveBeenCalled();
});
it("usa a organização autenticada e entrega resposta privada", async () => {
  const response = await POST(req());
  expect(response.status).toBe(201);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(salvarModelo).toHaveBeenCalledWith({}, "org-autorizada", modelo, "ator");
});
it("não ignora versão faltando ao ler um modelo", async () => {
  expect((await GET(new Request("https://crm.test/api/v1/documents/models?id=teste"))).status).toBe(
    422,
  );
  expect(listarModelos).not.toHaveBeenCalled();
});
