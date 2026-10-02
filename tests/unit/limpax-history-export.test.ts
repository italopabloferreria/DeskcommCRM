import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { collectHistorySubject } from "@/lib/lgpd/history-export";
const org = "5e000000-0000-4000-8000-000000000001";
const person = "5e100000-0000-4000-8000-000000000001";
const foreign = "5e000000-0000-4000-8000-000000000002";
const id = (n: number) => "5e200000-0000-4000-8000-" + String(n).padStart(12, "0");
type Row = Record<string, unknown>;
function client(
  tables: Record<string, Row[]>,
  failures: Record<string, string> = {},
  cap = 250,
  bypass = false,
) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  class Query {
    filters: Array<[string, unknown]> = [];
    span: [number, number] = [0, 249];
    constructor(readonly table: string) {
      calls.push({ table, filters: this.filters });
    }
    select() {
      return this;
    }
    eq(k: string, v: unknown) {
      this.filters.push([k, v]);
      return this;
    }
    limit(n: number) {
      this.span = [0, n - 1];
      return this;
    }
    order() {
      return this;
    }
    range(a: number, b: number) {
      this.span = [a, b];
      return this;
    }
    async then(resolve: (value: unknown) => unknown) {
      if (failures[this.table])
        return resolve({
          data: null,
          error: { code: failures[this.table], message: "secret database detail" },
        });
      const all = (tables[this.table] ?? []).filter(
        (r) => bypass || this.filters.every(([k, v]) => r[k] === v),
      );
      return resolve({
        data: all.slice(this.span[0], Math.min(this.span[1] + 1, this.span[0] + cap)),
        error: null,
      });
    }
  }
  return { db: { from: (t: string) => new Query(t) } as unknown as SupabaseClient, calls };
}
const location = (n = 1): Row => ({
  id: id(n),
  organization_id: org,
  person_id: person,
  address_original: "Rua fictícia",
  created_at: "2020-01-01T00:00:00Z",
  redacted_at: null,
});
const service: Row = {
  id: id(1),
  organization_id: org,
  person_id: person,
  location_id: null,
  import_row_id: id(2),
  original_reference: null,
  raw_data: { cells: ["Fictício"] },
  service_date: "2020-01-01",
  value_cents: 0,
  currency: null,
  notes_original: "",
  created_at: "2020-01-01T00:00:00Z",
  redacted_at: null,
};
const batch = { id: id(3), organization_id: org, kind: "limpax_history" };
const tables = () => ({
  import_batches: [batch],
  limpax_customer_locations: [location()],
  limpax_service_history: [service],
});
describe("exportação histórica do titular", () => {
  it("exporta originais e zero com filtros explícitos de organização e pessoa", async () => {
    const c = client(tables());
    const result = await collectHistorySubject(c.db, org, person);
    expect(result?.servicos[0]?.value_cents).toBe(0);
    expect(result?.servicos[0]?.raw_data).toEqual(service.raw_data);
    expect(result?.locais[0]?.address_original).toBe("Rua fictícia");
    for (const call of c.calls.filter((c) => c.table !== "import_batches")) {
      expect(call.filters).toContainEqual(["organization_id", org]);
      expect(call.filters).toContainEqual(["person_id", person]);
    }
  });
  it("não consulta tabelas opcionais sem evidência de histórico importado", async () => {
    const c = client({ import_batches: [] });
    expect(await collectHistorySubject(c.db, org, person)).toBeUndefined();
    expect(c.calls.map((c) => c.table)).toEqual(["import_batches"]);
  });
  it("não confunde lote de outra organização com módulo disponível", async () => {
    const c = client({ import_batches: [{ ...batch, organization_id: foreign }] });
    expect(await collectHistorySubject(c.db, org, person)).toBeUndefined();
  });
  it("recusa dados de outra organização mesmo se cliente administrativo os devolver", async () => {
    const c = client(
      { ...tables(), limpax_customer_locations: [{ ...location(), organization_id: foreign }] },
      {},
      250,
      true,
    );
    await expect(collectHistorySubject(c.db, org, person)).rejects.toThrow(
      "history_export_scope_mismatch",
    );
  });
  it.each(["42501", "42P01", "PGRST205", "XX000"])(
    "leitura indisponível %s não vira export completo",
    async (code) => {
      const c = client(tables(), { limpax_service_history: code });
      await expect(collectHistorySubject(c.db, org, person)).rejects.toThrow(
        "history_export_read_failed",
      );
    },
  );
  it("falha de presença não vira módulo vazio e mensagem não expõe detalhe", async () => {
    const c = client(tables(), { import_batches: "42501" });
    await expect(collectHistorySubject(c.db, org, person)).rejects.toThrow(
      "history_export_presence_failed",
    );
  });
  it("pagina mais de500 linhas mesmo quando servidor limita página a100", async () => {
    const c = client(
      {
        ...tables(),
        limpax_customer_locations: Array.from({ length: 601 }, (_, i) => location(i + 1)),
      },
      {},
      100,
    );
    expect((await collectHistorySubject(c.db, org, person))?.locais).toHaveLength(601);
  });
  it("excesso de bytes aborta export sem truncar dados", async () => {
    const c = client({
      ...tables(),
      limpax_customer_locations: Array.from({ length: 1200 }, (_, i) => ({
        ...location(i + 1),
        address_original: "x".repeat(16000),
      })),
    });
    await expect(collectHistorySubject(c.db, org, person)).rejects.toThrow(
      "history_export_size_exceeded",
    );
  });
  it("limite não trunca silenciosamente", async () => {
    const c = client({
      ...tables(),
      limpax_customer_locations: Array.from({ length: 10001 }, (_, i) => location(i + 1)),
    });
    await expect(collectHistorySubject(c.db, org, person)).rejects.toThrow(
      "history_export_limit_exceeded",
    );
  });
  it("validação do registro falha fechada e preserva estado redigido", async () => {
    const c = client({
      ...tables(),
      limpax_service_history: [
        { ...service, raw_data: {}, value_cents: null, redacted_at: "2026-10-02T00:00:00Z" },
      ],
    });
    expect(
      (await collectHistorySubject(c.db, org, person))?.servicos[0]?.redacted_at,
    ).not.toBeNull();
    const invalid = client({
      ...tables(),
      limpax_service_history: [{ ...service, value_cents: 1.5 }],
    });
    await expect(collectHistorySubject(invalid.db, org, person)).rejects.toThrow(
      "history_export_invalid_record",
    );
  });
});
