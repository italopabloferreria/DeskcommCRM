// @vitest-environment node
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { processCompaniesPeopleImport } from "@/lib/crm-b2b/import-process";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({
  requireSupportWrite: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/crm-b2b/import-process", () => ({ processCompaniesPeopleImport: vi.fn() }));
vi.mock("@/lib/crm-b2b/route-helpers", async () => {
  const wrappers = await import("@/lib/api/wrappers");
  return {
    ...wrappers,
    requestIdOf: () => "test",
    seModuloB2bDesligado: vi.fn().mockResolvedValue(null),
    handleRouteError: (e: Error) => wrappers.fail("internal_error", e.message, 500),
  };
});
function request(csv: string, fields: Record<string, string>) {
  const form = new FormData();
  form.set("file", new File([csv], "demo.csv", { type: "text/csv" }));
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new NextRequest("http://localhost/api/v1/imports", { method: "POST", body: form });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    org: { orgId: "org", role: "manager" },
    user: { id: "user" },
  } as never);
});
describe("análise sem gravar", () => {
  it("não permite contornar histórico mapeando endereço como nome", async () => {
    const response = await POST(
      request("Endereço\nRua fictícia", { mapping: JSON.stringify({ person_name: "Endereço" }) }),
    );
    expect(response.status).toBe(422);
    expect(createClient).not.toHaveBeenCalled();
    expect(processCompaniesPeopleImport).not.toHaveBeenCalled();
  });
  it("bloqueia confirmação direta com histórico sem destino antes de acessar o banco", async () => {
    const response = await POST(
      request(
        "Nome;Endereço;Valor;Data/Atend.;Observação\nCliente fictício;Rua fictícia;0;01/01/2024;Serviço fictício",
        { mapping: JSON.stringify({ person_name: "Nome" }) },
      ),
    );
    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toContain("ainda não está habilitada");
    expect(createClient).not.toHaveBeenCalled();
    expect(processCompaniesPeopleImport).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
  it("a prévia conta todas as linhas e não grava nada", async () => {
    const response = await POST(
      request("Nome;Endereço\nCliente fictício;Rua fictícia", {
        preview: "true",
        mapping: JSON.stringify({ person_name: "Nome" }),
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.source_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(json.data.historical_review.address_rows).toBe(1);
    expect(json.data.historical_review.sample[0].raw.address).toBe("Rua fictícia");
    expect(json.data.unmapped_columns).toEqual([{ header: "Endereço", populated_rows: 1 }]);
    expect(createClient).not.toHaveBeenCalled();
    expect(processCompaniesPeopleImport).not.toHaveBeenCalled();
  });
  it("mostra cabeçalhos desconhecidos sem acessar o banco", async () => {
    const response = await POST(
      request("Cliente;Responsável\nEmpresa teste;Pessoa teste", { preview: "true" }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.headers).toEqual(["Cliente", "Responsável"]);
    expect(json.data.raw_sample[0]).toEqual(["Empresa teste", "Pessoa teste"]);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("recusa confirmação sem campo identificador e sem gravar lote", async () => {
    const response = await POST(request("Cliente\nTeste", { mapping: "{}" }));
    expect(response.status).toBe(422);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("recusa colunas ausentes e cabeçalhos repetidos", async () => {
    expect(
      (
        await POST(
          request("Empresa\nTeste", { mapping: JSON.stringify({ company_name: "Inexistente" }) }),
        )
      ).status,
    ).toBe(422);
    expect((await POST(request("Nome;Nome\nA;B", { preview: "true" }))).status).toBe(422);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("recusa acesso sem permissão antes de ler a planilha", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    expect((await POST(request("Empresa\nTeste", { preview: "true" }))).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("confirmação transacional pela rota", () => {
  it.each([false, true])(
    "reused=%s devolve o lote confirmado sem criar lote por tabela",
    async (reused) => {
      const summary = {
        batch_id: "11111111-1111-4111-8111-111111111111",
        successful_rows: 1,
        failed_rows: 0,
        conflict_rows: 0,
        processed_rows: 1,
        reused,
      };
      vi.mocked(createClient).mockResolvedValue({} as never);
      vi.mocked(processCompaniesPeopleImport).mockResolvedValue(summary);
      const response = await POST(
        request("Empresa\nTeste", { mapping: JSON.stringify({ company_name: "Empresa" }) }),
      );
      expect(response.status).toBe(reused ? 200 : 201);
      expect((await response.json()).data.batch_id).toBe(summary.batch_id);
      expect(processCompaniesPeopleImport).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ filename: "demo.csv", organizationId: "org" }),
      );
      expect(audit).toHaveBeenCalledTimes(reused ? 0 : 1);
    },
  );
});

describe("largura dos dados preservada na borda", () => {
  it("recusa prévia e confirmação antes de qualquer acesso ao banco", async () => {
    const cases: Record<string, string>[] = [
      { preview: "true" },
      { mapping: JSON.stringify({ person_name: "Nome" }) },
    ];
    for (const fields of cases) {
      const response = await POST(
        request("Nome;Telefone\nCliente fictício;61900000000;Endereço fictício", fields),
      );
      expect(response.status).toBe(422);
      expect((await response.json()).error.message).toContain("sem cabeçalho");
    }
    expect(createClient).not.toHaveBeenCalled();
    expect(processCompaniesPeopleImport).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
});

describe("rascunho revisado não libera gravação", () => {
  const csv = "Nome;Endereço;Valor;Data/Atend.\nCliente fictício;Rua fictícia;0;01/01/2024";
  const source = createHash("sha256").update(csv).digest("hex");
  const decisions = {
    source_sha256: source,
    decisions: [
      {
        data_row_index: 1,
        customer: { kind: "person", id: "11111111-1111-4111-8111-111111111111" },
        location: { kind: "create_from_original" },
        accept_original_date: true,
        accept_original_value: true,
      },
    ],
  };
  it("valida pela análise autenticada sem banco", async () => {
    const response = await POST(
      request(csv, { preview: "true", historical_review: JSON.stringify(decisions) }),
    );
    expect(response.status).toBe(200);
    const data = (await response.json()).data.reviewed_draft;
    expect(data.draft_validated_rows).toBe(1);
    expect(data.ownership_verified).toBe(false);
    expect(data.sample[0].value_cents).toBe(0);
    expect(createClient).not.toHaveBeenCalled();
    expect(processCompaniesPeopleImport).not.toHaveBeenCalled();
  });
  it.each(["{", JSON.stringify({ ...decisions, source_sha256: "b".repeat(64) })])(
    "recusa revisão inválida ou de outra fonte",
    async (historical_review) => {
      expect((await POST(request(csv, { preview: "true", historical_review }))).status).toBe(422);
      expect(createClient).not.toHaveBeenCalled();
    },
  );
  it("não permite usar um rascunho para confirmar carga", async () => {
    expect(
      (
        await POST(
          request(csv, {
            historical_review: JSON.stringify(decisions),
            mapping: JSON.stringify({ person_name: "Nome" }),
          }),
        )
      ).status,
    ).toBe(422);
    expect(createClient).not.toHaveBeenCalled();
    expect(processCompaniesPeopleImport).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
});

describe("paginação histórica sem banco", () => {
  const csv =
    "Nome;Endereço\n" +
    Array.from({ length: 30 }, (_, index) => "Fictício " + (index + 1) + ";Rua fictícia").join(
      "\n",
    );
  it("permite revisar linhas depois da amostra de cinco", async () => {
    const response = await POST(request(csv, { preview: "true", historical_page: "2" }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.historical_page).toMatchObject({ page: 2, page_size: 25, total_pages: 2 });
    expect(
      json.data.historical_page.rows.map((row: { data_row_index: number }) => row.data_row_index),
    ).toEqual([26, 27, 28, 29, 30]);
    expect(createClient).not.toHaveBeenCalled();
    expect(processCompaniesPeopleImport).not.toHaveBeenCalled();
  });
  it.each(["0", "3", "-1", "1.5", "9999"])("recusa página inválida %s sem banco", async (page) => {
    const response = await POST(request(csv, { preview: "true", historical_page: page }));
    expect(response.status).toBe(422);
    expect(createClient).not.toHaveBeenCalled();
  });
});
