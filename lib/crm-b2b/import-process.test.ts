// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processCompaniesPeopleImport } from "./import-process";
vi.mock("@/lib/crm-b2b/enrich", () => ({ enrichCompanyFromBrasilApi: vi.fn() }));
type Row = Record<string, unknown>;
function database() {
  const tables: Record<string, Row[]> = {
    companies: [],
    people: [],
    contacts: [],
    company_people: [],
    import_rows: [],
    import_batches: [],
  };
  let id = 0;
  const from = (table: string) => {
    let op = "select",
      payload: Row = {},
      limit = Infinity;
    const filters: ((r: Row) => boolean)[] = [];
    const query = {
      select: () => query,
      order: () => query,
      eq: (key: string, value: unknown) => {
        filters.push((r) =>
          key === "people.normalized_name"
            ? (r.people as Row)?.normalized_name === value
            : r[key] === value,
        );
        return query;
      },
      is: (key: string, value: unknown) => {
        filters.push((r) => (r[key] ?? null) === value);
        return query;
      },
      in: (key: string, values: unknown[]) => {
        filters.push((r) => values.includes(r[key]));
        return query;
      },
      limit: (n: number) => {
        limit = n;
        return query;
      },
      insert: (r: Row) => {
        op = "insert";
        payload = r;
        return query;
      },
      upsert: (r: Row) => {
        op = "insert";
        payload = r;
        return query;
      },
      update: (r: Row) => {
        op = "update";
        payload = r;
        return query;
      },
      single: async () => {
        const result = execute();
        return { data: result.data[0] ?? null, error: null };
      },
      maybeSingle: async () => {
        const result = execute();
        return { data: result.data[0] ?? null, error: null };
      },
      then: (resolve: (v: unknown) => unknown, reject: (v: unknown) => unknown) =>
        Promise.resolve(execute()).then(resolve, reject),
    };
    const execute = () => {
      if (op === "insert") {
        const row = { id: String(++id), ...payload };
        tables[table]!.push(row);
        op = "select";
        return { data: [row], error: null };
      }
      const records = tables[table]!.map((r) =>
        table === "company_people" || table === "contacts"
          ? { ...r, people: tables.people!.find((p) => p.id === r.person_id) ?? null }
          : r,
      );
      const matching = records.filter((r) => filters.every((f) => f(r))).slice(0, limit);
      if (op === "update")
        for (const r of tables[table]!.filter((r) => filters.every((f) => f(r))))
          Object.assign(r, payload);
      return { data: matching, error: null };
    };
    return query;
  };
  return { tables, client: { from } as unknown as SupabaseClient };
}
const sheet = {
  headers: ["Empresa", "Pessoa", "Telefone", "Email"],
  rows: [["Empresa fictícia", "Pessoa fictícia", "11999990000", "pessoa@example.invalid"]],
};
const mapping = {
  company_name: "Empresa",
  person_name: "Pessoa",
  phone: "Telefone",
  email: "Email",
};
describe("repetição sequencial da importação", () => {
  it("reutiliza empresa sem CNPJ, pessoa e contato ao repetir o mesmo arquivo", async () => {
    const db = database();
    const opts = {
      organizationId: "org",
      batchId: "batch",
      userId: "user",
      sheet,
      mapping,
      enrichCompanies: false,
    };
    expect((await processCompaniesPeopleImport(db.client, opts)).successful_rows).toBe(1);
    expect(
      (await processCompaniesPeopleImport(db.client, { ...opts, batchId: "batch2" }))
        .successful_rows,
    ).toBe(1);
    expect(db.tables.companies).toHaveLength(1);
    expect(db.tables.people).toHaveLength(1);
    expect(db.tables.contacts).toHaveLength(1);
    expect(db.tables.company_people).toHaveLength(1);
  });
  it("recusa telefone de outra pessoa antes de criar empresa ou pessoa", async () => {
    const db = database();
    db.tables.people!.push({
      id: "person",
      organization_id: "org",
      normalized_name: "outra pessoa",
    });
    db.tables.contacts!.push({
      id: "contact",
      organization_id: "org",
      phone_number: "+5511999990000",
      person_id: "person",
    });
    const result = await processCompaniesPeopleImport(db.client, {
      organizationId: "org",
      batchId: "batch",
      userId: "user",
      sheet,
      mapping,
      enrichCompanies: false,
    });
    expect(result.conflict_rows).toBe(1);
    expect(db.tables.companies).toHaveLength(0);
    expect(db.tables.people).toHaveLength(1);
  });
  it("não reutiliza cadastros de outra organização", async () => {
    const db = database();
    db.tables.companies!.push({
      id: "other",
      organization_id: "other-org",
      trade_name: "Empresa fictícia",
      legal_name: "Empresa fictícia",
    });
    await processCompaniesPeopleImport(db.client, {
      organizationId: "org",
      batchId: "batch",
      userId: "user",
      sheet,
      mapping,
      enrichCompanies: false,
    });
    expect(db.tables.companies).toHaveLength(2);
    expect(db.tables.company_people![0]?.company_id).not.toBe("other");
  });
});
