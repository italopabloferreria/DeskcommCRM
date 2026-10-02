/** Synthetic adapter reused from the existing authorized collector regression. */
/**
 * ADR-0002 D8 (achado da revisão do PR #1578): todo módulo com dados declara a
 * sua seção de export, mesmo sem estar na cascata de redação — honorários não
 * tem texto livre sobre a pessoa (é parâmetro financeiro e calendário), então
 * `tests/unit/lgpd-exporta-o-que-redige.test.ts` (que deriva a lista do que se
 * REDIGE) nunca cobriria esta lacuna. Este arquivo prova a seção diretamente.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mock.admin }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn() } }));
import { collectExportData } from "@/lib/lgpd/export-collector";

type Row = Record<string, unknown>;
const ORG = "5e000000-0000-4000-8000-000000000001";
const CONTACT = "5e100000-0000-4000-8000-000000000001";
const LEAD = "lead-a";
const CONTRATO = "contrato-a";
const request = {
  organizationId: ORG,
  requestId: "export-1",
  contactId: CONTACT,
  externalCustomerId: null,
};
let rows: Record<string, Row[]>;
/** 42P01 só para as duas tabelas do módulo — simula instalação sem o módulo. */
let moduloDesinstalado: boolean;
/** Erro de leitura que NÃO é "tabela inexistente" numa das tabelas do módulo. */
let falhaDeLeitura: string | null;

class ReadQuery {
  columns = "";
  filters: [string, unknown][] = [];
  ins: [string, unknown[]][] = [];
  page: [number, number] = [0, 100000];
  constructor(readonly table: string) {}
  select(columns: string) {
    this.columns = columns;
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }
  in(key: string, values: unknown[]) {
    this.ins.push([key, values]);
    return this;
  }
  order() {
    return this;
  }
  limit(limit: number) {
    this.page = [0, limit - 1];
    return this;
  }
  range(from: number, to: number) {
    this.page = [from, to];
    return this;
  }
  or() {
    return this;
  }
  async maybeSingle() {
    const result = await this.execute();
    return { ...result, data: result.data?.[0] ?? null };
  }
  then(resolve: (result: unknown) => unknown, reject?: (error: unknown) => unknown) {
    return this.execute().then(resolve, reject);
  }
  async execute() {
    if (falhaDeLeitura === this.table) {
      return {
        data: null,
        error: { code: "57014", message: "canceling statement due to statement timeout" },
      };
    }
    if (
      moduloDesinstalado &&
      (this.table === "honorarios_contratos" || this.table === "honorarios_parcelas")
    ) {
      return { data: null, error: { code: "42P01", message: "relation does not exist" } };
    }
    const data = (rows[this.table] ?? [])
      .filter((row) => this.filters.every(([key, value]) => row[key] === value))
      .filter((row) => this.ins.every(([key, values]) => values.includes(row[key])))
      .slice(this.page[0], this.page[1] + 1)
      .map((row) =>
        Object.fromEntries(
          this.columns
            .split(",")
            .map((column) => column.trim())
            .map((column) => [column, row[column]]),
        ),
      );
    return { data, error: null };
  }
}

beforeEach(() => {
  moduloDesinstalado = false;
  falhaDeLeitura = null;
  rows = {
    organizations: [
      { id: ORG, legal_name: "Escritório Teste", display_name: "Teste", dpo_email: null },
    ],
    contacts: [
      {
        id: CONTACT,
        organization_id: ORG,
        name: "Cliente Teste",
        created_at: "2026-09-15T00:00:00Z",
      },
    ],
    crm_leads: [
      {
        id: LEAD,
        organization_id: ORG,
        contact_id: CONTACT,
        pipeline_id: "pipeline-a",
        stage_id: "stage-a",
        title: "Caso Teste",
        status: "open",
        value_cents: 500000,
        currency: "BRL",
        created_at: "2026-09-15T00:00:00Z",
      },
    ],
    honorarios_contratos: [
      {
        id: CONTRATO,
        organization_id: ORG,
        lead_id: LEAD,
        modelo: "fixo",
        valor_fixo_cents: 500000,
        percentual_exito: null,
        repasse_advogado_pct: null,
        created_at: "2026-09-16T00:00:00Z",
      },
    ],
    honorarios_parcelas: [
      {
        id: "parcela-a",
        organization_id: ORG,
        contrato_id: CONTRATO,
        numero: 1,
        vencimento: "2026-10-01",
        valor_cents: 250000,
        status: "pendente",
        financial_entry_id: null,
      },
    ],
  };
  mock.admin.mockReturnValue({ from: (table: string) => new ReadQuery(table) });
});

const PERSON = "5e200000-0000-4000-8000-000000000001";
function enableHistory() {
  const contact = rows.contacts?.[0];
  if (!contact) throw new Error("Missing synthetic contact");
  contact.person_id = PERSON;
  rows.people = [{ id: PERSON, organization_id: ORG, full_name: "Fictício" }];
  rows.import_batches = [{ id: PERSON, organization_id: ORG, kind: "limpax_history" }];
  rows.limpax_customer_locations = [
    {
      id: PERSON,
      organization_id: ORG,
      person_id: PERSON,
      address_original: "Local fictício",
      created_at: "2020-01-01T00:00:00Z",
      redacted_at: null,
    },
  ];
}
describe("histórico no coletor LGPD existente", () => {
  it("entrega locais pessoais através do fluxo de export autorizado", async () => {
    enableHistory();
    const result = await collectExportData(request);
    expect(result.b2b?.historico_limpax?.locais).toHaveLength(1);
    expect(result.b2b?.historico_limpax?.locais[0]?.address_original).toBe("Local fictício");
  });
  it("falha histórica aborta coleta em vez de completar com seção omitida", async () => {
    enableHistory();
    const location = rows.limpax_customer_locations?.[0];
    if (!location) throw new Error("Missing synthetic location");
    location.address_original = null;
    await expect(collectExportData(request)).rejects.toThrow("history_export_invalid_record");
  });
});
