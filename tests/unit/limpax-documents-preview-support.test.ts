import { expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/documents/preview/route";
import { fail } from "@/lib/api/wrappers";
const h = vi.hoisted(() => ({ support: vi.fn(), render: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: async () => ({ ok: true, org: { orgId: "test", name: "Fictícia" } }),
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: h.support }));
vi.mock("@/lib/documentos/previa-pdf", () => ({ renderizarPrevia: h.render }));
it("prévia com assinatura não permite emitir documento em suporte somente leitura", async () => {
  h.support.mockResolvedValue(fail("forbidden", "Somente leitura", 403));
  const r = await POST(
    new Request("https://crm.test/api/v1/documents/preview", {
      method: "POST",
      headers: { origin: "https://crm.test", "content-type": "application/json" },
      body: JSON.stringify({ titulo: "Contrato fictício", paginas: [], assinaturas: [] }),
    }),
  );
  expect(r.status).toBe(403);
  expect(h.render).not.toHaveBeenCalled();
});
