// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/imports/route";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  auth: vi.fn(),
  support: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.auth }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: mocks.support }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => {
  const w = await import("@/lib/api/wrappers");
  return {
    ...w,
    requestIdOf: () => "synthetic",
    seModuloB2bDesligado: async () => null,
    handleRouteError: () => w.fail("internal_error", "Falha segura.", 500),
  };
});
const id = "71000000-0000-4000-8000-000000000001",
  org = "71000000-0000-4000-8000-000000000002";
const csv =
  "Nome;Endereço;Valor;Data/Atend.;Observação;Extra\nFictício;Rua fictícia;0;01/01/2024;Serviço;Preservado";
const hash = createHash("sha256").update(csv).digest("hex");
function request(extra: Record<string, string> = {}, origin = "http://localhost") {
  const form = new FormData();
  form.set("file", new File([csv], "synthetic.csv"));
  form.set("historical_confirm", "true");
  form.set(
    "historical_review",
    JSON.stringify({
      source_sha256: hash,
      decisions: [
        {
          data_row_index: 1,
          customer: { kind: "person", id },
          location: { kind: "create_from_original" },
          accept_original_date: true,
          accept_original_value: true,
        },
      ],
    }),
  );
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return new NextRequest("http://localhost/api/v1/imports", {
    method: "POST",
    body: form,
    headers: { origin },
  });
}
const receipt = {
  receipt_id: id,
  batch_id: org,
  total_rows: 1,
  service_rows: 1,
  locations_created: 1,
  auxiliary_rows: 0,
  reused: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, org: { orgId: org, role: "manager" }, user: { id } });
  mocks.support.mockResolvedValue(null);
  mocks.create.mockResolvedValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: receipt, error: null });
});
describe("confirmação histórica sem perda de origem", () => {
  it("usa uma RPC com org confiável, bruto integral, zero e data revisada", async () => {
    const res = await POST(request());
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual(receipt);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "fn_limpax_history_import_atomic",
      expect.objectContaining({
        p_organization_id: org,
        p_source_sha256: hash,
        p_filename: "synthetic.csv",
        p_rows: [
          expect.objectContaining({
            person_id: id,
            value_cents: 0,
            service_date: "2024-01-01",
            raw_data: expect.objectContaining({
              cells: ["Fictício", "Rua fictícia", "0", "01/01/2024", "Serviço", "Preservado"],
            }),
          }),
        ],
      }),
    );
  });
  it("replay devolve o mesmo recibo com 200", async () => {
    mocks.rpc.mockResolvedValue({ data: { ...receipt, reused: true }, error: null });
    expect((await POST(request())).status).toBe(200);
  });
  it("sem aceite explícito não confirma", async () => {
    expect((await POST(request({ historical_confirm: "false" }))).status).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("decisões de outro arquivo são recusadas antes do banco", async () => {
    expect(
      (
        await POST(
          request({
            historical_review: JSON.stringify({ source_sha256: "b".repeat(64), decisions: [] }),
          }),
        )
      ).status,
    ).toBe(422);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("linhas ainda pendentes não gravam lote parcial", async () => {
    expect(
      (
        await POST(
          request({ historical_review: JSON.stringify({ source_sha256: hash, decisions: [] }) }),
        )
      ).status,
    ).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("recusa origem externa e suporte readonly", async () => {
    expect((await POST(request({}, "https://other.invalid"))).status).toBe(403);
    mocks.support.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await POST(request())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["PGRST202", "42883", "42P01"])(
    "função/módulo ausente %s falha fechado",
    async (code) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "private details" } });
      const res = await POST(request());
      expect(res.status).toBe(409);
      expect(JSON.stringify(await res.json())).not.toContain("private details");
    },
  );
  it.each([
    ["42501", 403],
    ["55006", 409],
    ["P0001", 409],
    ["23514", 422],
    ["XX000", 500],
  ])("erro SQL %s não vaza conteúdo", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "private details" } });
    const res = await POST(request());
    expect(res.status).toBe(status);
    expect(JSON.stringify(await res.json())).not.toContain("private details");
  });
  it("resultado inválido não inventa sucesso", async () => {
    mocks.rpc.mockResolvedValue({ data: { batch_id: org }, error: null });
    expect((await POST(request())).status).toBe(500);
  });
  it("prévia com revisão continua sem efeitos", async () => {
    const res = await POST(request({ preview: "true", historical_confirm: "false" }));
    expect(res.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
