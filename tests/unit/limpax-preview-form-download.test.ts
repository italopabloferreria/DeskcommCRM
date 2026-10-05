// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/documents/preview/route";
import { requireRole } from "@/lib/auth/require-role";
import { renderizarPrevia } from "@/lib/documentos/previa-pdf";
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: async () => null }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/documentos/previa-pdf", () => ({ renderizarPrevia: vi.fn() }));
const documento = { titulo: "Teste", destinatario: "Cliente fictício", paginas: [{ texto: "Teste" }], assinaturas: [] };
function pedido(payload: unknown = documento, origin = "https://crm.test") {
  return new Request("https://crm.test/api/v1/documents/preview", {
    method: "POST", headers: { origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ documento: JSON.stringify(payload) }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireRole).mockResolvedValue({ ok: true, user: { id: "ator" }, org: { orgId: "org", name: "Teste", role: "agent" } } as never);
  vi.mocked(renderizarPrevia).mockResolvedValue(Buffer.from("%PDF-teste"));
});
describe("download nativo da prévia", () => {
  it("entrega PDF privado como anexo sem gravar no arquivo", async () => {
    const resposta = await POST(pedido());
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Content-Disposition")).toContain("attachment");
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await resposta.text()).toBe("%PDF-teste");
  });
  it("nega origem externa antes de renderizar", async () => {
    expect((await POST(pedido(documento, "https://externo.test"))).status).toBe(403);
    expect(renderizarPrevia).not.toHaveBeenCalled();
  });
  it("não aceita organização enviada no formulário", async () => {
    expect((await POST(pedido({ ...documento, organization_id: "outro" }))).status).toBe(422);
    expect(renderizarPrevia).not.toHaveBeenCalled();
  });
  it("nega sessão anônima", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) } as never);
    expect((await POST(pedido())).status).toBe(401);
    expect(renderizarPrevia).not.toHaveBeenCalled();
  });
  it("mantém limite real do corpo inclusive no formulário", async () => {
    expect((await POST(pedido({ ...documento, titulo: "a".repeat(1024 * 1024) }))).status).toBe(413);
    expect(renderizarPrevia).not.toHaveBeenCalled();
  });
});
