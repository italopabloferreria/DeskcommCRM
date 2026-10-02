// @vitest-environment node
import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import { expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderLgpdPdf } from "@/lib/lgpd/pdf-renderer";
import type { ExportPayload, ProposalRow } from "@/lib/lgpd/export-collector";

/**
 * O relatório que o titular RECEBE é o PDF — o `data.json` fica no bucket.
 * A proposta comercial entrou no JSON (#1832) e não aparecia no PDF: o titular
 * pedia acesso e lia um relatório sem nenhuma das propostas que recebeu.
 */
function payload(proposals: ProposalRow[] | undefined): ExportPayload {
  return {
    request_id: "3f2a9c10-0000-4000-8000-000000000001",
    organization_id: "8c1d4e20-0000-4000-8000-000000000002",
    organization_legal_name: "Bem Viver Servicos LTDA",
    organization_display_name: "Bem Viver",
    lei_citada: "LGPD Art. 18, II (Lei nº 13.709/2018)",
    documento_rotulo: "CPF",
    dpo_email: null,
    generated_at: "2030-01-02T13:05:00Z",
    no_local_footprint: false,
    contact: null,
    consents: [],
    conversations: [],
    messages_count_total: 0,
    messages_recent: [],
    leads: [],
    orders: [],
    activities: [],
    appointments: [],
    sales: [],
    proposals,
    tasks: [],
    webhook_captures: [],
    audit_log_extract: [],
    meeting_deliveries: [],
    voice_calls: [],
    prospecting_candidates: [],
    cases: [],
    case_events: [],
    case_chat_messages: [],
    checkpoints: [],
    passagens: [],
    avisos_de_caso: [],
    demandas: [],
    campaign_recipients: [],
    campaign_suppressions: [],
    appointment_notices: [],
    channel_session_groups: [],
    group_messages_authored: [],
  } as unknown as ExportPayload;
}

async function texto(data: ExportPayload): Promise<string> {
  const bytes = await renderLgpdPdf(data);
  const fonts =
    join(
      dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")),
      "standard_fonts",
    )
      .split(sep)
      .join("/") + "/";
  const task = getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: fonts });
  const doc = await task.promise;
  try {
    const partes: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const c = await (await doc.getPage(n)).getTextContent();
      partes.push(c.items.map((i) => ("str" in i ? i.str : "")).join(" "));
    }
    return partes.join("\n").replace(/\s+/g, " ");
  } finally {
    await task.destroy();
  }
}

it("PDF recebido inclui endereço, notas e bruto do histórico pessoal", async () => {
  const data = payload(undefined);
  data.b2b = {
    pessoa: null,
    vinculos: [],
    linhas_importadas: [],
    historico_limpax: {
      locais: [
        {
          id: "5e000000-0000-4000-8000-000000000001",
          organization_id: data.organization_id,
          person_id: "5e100000-0000-4000-8000-000000000001",
          address_original: "Rua Ficticia Historica",
          created_at: "2020-01-01",
          redacted_at: null,
        },
      ],
      servicos: [
        {
          id: "5e200000-0000-4000-8000-000000000001",
          organization_id: data.organization_id,
          person_id: "5e100000-0000-4000-8000-000000000001",
          location_id: null,
          import_row_id: "5e300000-0000-4000-8000-000000000001",
          original_reference: null,
          raw_data: { cells: ["Origem historica ficticia"] },
          service_date: "2020-01-01",
          value_cents: 0,
          currency: null,
          notes_original: "Nota historica ficticia",
          created_at: "2020-01-01",
          redacted_at: null,
        },
      ],
    },
  };
  const result = await texto(data);
  expect(result).toContain("Rua Ficticia Historica");
  expect(result).toContain("Origem historica ficticia");
  expect(result).toContain("Nota historica ficticia");
  expect(result).toContain("Valor em centavos: 0");
});
