import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { requireRole } from "@/lib/auth/require-role";
import { isServiceRoleConfigured } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { emitirConvite } from "@/lib/team/convites";

vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/audit", () => ({ isServiceRoleConfigured: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/team/convites", () => ({ emitirConvite: vi.fn() }));

const ORG = "11111111-1111-4111-8111-111111111111";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const INVITE = "33333333-3333-4333-8333-333333333333";

function pedido() {
  return new NextRequest("http://localhost/api/v1/team/invite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invitations: [{ email: "Pessoa@Example.invalid", role: "agent" }] }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isServiceRoleConfigured).mockReturnValue(true);
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: ADMIN, email: "admin@example.invalid", full_name: "Admin" },
    org: { orgId: ORG, name: "Teste", role: "admin" },
  } as never);
  vi.mocked(createAdminClient).mockReturnValue({
    from: () => ({ select: () => ({ eq: () => ({ is: async () => ({ data: [], error: null }) }) }) }),
  } as never);
  vi.mocked(emitirConvite).mockResolvedValue({
    convite: { id: INVITE, expires_at: "2026-10-01T00:00:00.000Z" },
    accept_url: "http://localhost:3000/team/accept-invite/teste",
    email_dispatched: false,
    renovado: false,
  } as never);
});

describe("convite restrito a administradores", () => {
  it("recusa papéis abaixo de admin antes de acessar credenciais ou emitir convite", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: Response.json({ error: "forbidden_role" }, { status: 403 }),
    } as never);
    const { POST } = await import("./route");
    const res = await POST(pedido());

    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("admin", expect.objectContaining({ resource: "team" }));
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(emitirConvite).not.toHaveBeenCalled();
  });

  it("não gera convite sem registro revogável", async () => {
    vi.mocked(isServiceRoleConfigured).mockReturnValue(false);
    const { POST } = await import("./route");
    const res = await POST(pedido());

    expect(res.status).toBe(503);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(emitirConvite).not.toHaveBeenCalled();
  });

  it("admin emite convite da organização ativa, sem envio real no teste", async () => {
    const { POST } = await import("./route");
    const res = await POST(pedido());

    expect(res.status).toBe(201);
    expect(emitirConvite).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: "pessoa@example.invalid",
        organizationId: ORG,
        inviterId: ADMIN,
        role: "agent",
      }),
    );
  });
});
