// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareImportRows, processCompaniesPeopleImport } from "./import-process";
const sheet = {
  headers: ["Empresa", "Pessoa", "Telefone", "Email"],
  rows: [["Empresa fictícia", "José Teste", "11999990000", "pessoa@example.invalid"]],
};
const mapping = {
  company_name: "Empresa",
  person_name: "Pessoa",
  phone: "Telefone",
  email: "Email",
};
const opts = { organizationId: "org", filename: "teste.csv", requestId: "test", sheet, mapping };
const summary = {
  batch_id: "11111111-1111-4111-8111-111111111111",
  successful_rows: 1,
  failed_rows: 0,
  conflict_rows: 0,
  processed_rows: 1,
  reused: false,
};
describe("importação transacional", () => {
  it("normaliza nomes/telefones e envia uma única RPC sem escritas por tabela", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: summary, error: null });
    const from = vi.fn();
    expect(
      await processCompaniesPeopleImport({ rpc, from } as unknown as SupabaseClient, opts),
    ).toEqual(summary);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
    const payload = rpc.mock.calls[0]?.[1];
    expect(payload.p_organization_id).toBe("org");
    expect(payload.p_rows[0].normalized_data.phone_e164).toBe("+5511999990000");
    expect(payload.p_rows[0].normalized_data.normalized_name).toBe("jose teste");
  });
  it("marca erro de validação para a linha sem criar clientes", () => {
    const rows = prepareImportRows(
      { ...sheet, rows: [["Teste", "Pessoa", "ruim", "ruim"]] },
      mapping,
    );
    expect(rows[0]?.validation_error).toBe("Telefone inválido.");
  });
  it("devolve replay confirmado pelo banco", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ...summary, reused: true }, error: null });
    expect(
      (await processCompaniesPeopleImport({ rpc } as unknown as SupabaseClient, opts)).reused,
    ).toBe(true);
  });
  it.each([
    ["PGRST202", 503],
    ["42883", 503],
    ["55006", 409],
    ["42501", 403],
    ["22023", 422],
    ["XX000", 500],
  ])("recusa %s sem voltar ao importador não transacional", async (code, status) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code } });
    const from = vi.fn();
    await expect(
      processCompaniesPeopleImport({ rpc, from } as unknown as SupabaseClient, opts),
    ).rejects.toMatchObject({ status });
    expect(from).not.toHaveBeenCalled();
  });
});
