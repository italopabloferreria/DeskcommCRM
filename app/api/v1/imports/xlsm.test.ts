// @vitest-environment node
import { strToU8, zipSync } from "fflate";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { confirmHistoricalImport } from "@/lib/crm-b2b/historical-process";

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi
    .fn()
    .mockResolvedValue({ ok: true, org: { orgId: "org", role: "manager" }, user: { id: "user" } }),
}));
vi.mock("@/lib/impersonate/support", () => ({
  requireSupportWrite: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/crm-b2b/historical-process", () => ({ confirmHistoricalImport: vi.fn() }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => {
  const wrappers = await import("@/lib/api/wrappers");
  return {
    ...wrappers,
    requestIdOf: () => "test",
    seModuloB2bDesligado: vi.fn().mockResolvedValue(null),
    handleRouteError: () => wrappers.fail("internal_error", "Erro de teste", 500),
  };
});

function request(fields: Record<string, string>) {
  const zip = zipSync({
    "xl/workbook.xml": strToU8('<workbook><sheet name="Cadastro" r:id="rId1"/></workbook>'),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      '<worksheet><row><c r="A1" t="inlineStr"><is><t>Nome</t></is></c></row><row><c r="A2" t="inlineStr"><is><t>Pessoa fictícia</t></is></c></row></worksheet>',
    ),
  });
  const form = new FormData();
  form.set("file", new File([new Uint8Array(zip).buffer], "cadastro.xlsm"));
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new NextRequest("http://localhost/api/v1/imports", { method: "POST", body: form });
}
beforeEach(() => vi.clearAllMocks());
describe("XLSM não grava no banco", () => {
  it("retorna análise e indicação de macros ignoradas", async () => {
    const response = await POST(request({ preview: "true" }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.workbook.analysis_only).toBe(true);
    expect(createClient).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{}, { historical_confirm: "true", historical_review: "{}" }])(
    "recusa gravação mesmo com confirmação histórica: %j",
    async (fields) => {
      const response = await POST(request(fields));
      expect(response.status).toBe(422);
      expect((await response.json()).error.message).toContain("XLSM");
      expect(createClient).not.toHaveBeenCalled();
      expect(confirmHistoricalImport).not.toHaveBeenCalled();
      expect(audit).not.toHaveBeenCalled();
    },
  );
});
