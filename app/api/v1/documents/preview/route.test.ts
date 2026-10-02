// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireRole } from "@/lib/auth/require-role";
import { renderizarPrevia } from "@/lib/documentos/previa-pdf";
import { POST } from "./route";
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: async () => null }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/documentos/previa-pdf", () => ({ renderizarPrevia: vi.fn() }));
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNggAIAAAkAAftSuKkAAAAASUVORK5CYII=";
const body = {
  titulo: "Teste",
  destinatario: "Cliente teste",
  paginas: [{ texto: "Teste" }],
  assinaturas: [],
};
const req = (value: unknown = body, origin = "https://crm.test") =>
  new Request("https://crm.test/api/v1/documents/preview", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: "ator" },
    org: { orgId: "org", name: "Empresa autorizada", role: "admin" },
  } as never);
  vi.mocked(renderizarPrevia).mockResolvedValue(Buffer.from("%PDF-teste"));
});
describe("prévia autenticada", () => {
  it("nega acesso sem autenticação antes de renderizar", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    } as never);
    expect((await POST(req())).status).toBe(401);
    expect(renderizarPrevia).not.toHaveBeenCalled();
  });
  it("recusa origem externa", async () => {
    expect((await POST(req(body, "https://outro.test"))).status).toBe(403);
  });
  it("recusa tentativa de escolher organização pelo corpo", async () => {
    expect((await POST(req({ ...body, organization_id: "outra" }))).status).toBe(422);
  });
  it("reserva PNG a administrador e não renderiza em caso de negação", async () => {
    vi.mocked(requireRole)
      .mockResolvedValueOnce({ ok: true, user: {}, org: { orgId: "org", role: "agent" } } as never)
      .mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect(
      (
        await POST(
          req({
            ...body,
            assinaturas: [
              {
                tipo: "carimbo",
                nome: "Emissor",
                qualificacao: "",
                png,
                pagina: 1,
                x: 20,
                y: 235,
                largura: 60,
                altura: 20,
              },
            ],
          }),
        )
      ).status,
    ).toBe(403);
    expect(renderizarPrevia).not.toHaveBeenCalled();
  });
  it("gera resposta privada usando o nome da organização autorizada", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(renderizarPrevia).toHaveBeenCalledWith(body, "Empresa autorizada");
  });
});
