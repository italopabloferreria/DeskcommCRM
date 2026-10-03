import { type NextRequest } from "next/server";
import { readImportForm } from "@/lib/crm-b2b/import-body";
import { createHash } from "node:crypto";
import { prepareHistoricalCommand } from "@/lib/crm-b2b/historical-command";
import { confirmHistoricalImport } from "@/lib/crm-b2b/historical-process";
import { validateHistoricalReview } from "@/lib/crm-b2b/historical-review";
import { historicalRowsForReview, historicalPreview } from "@/lib/crm-b2b/historical-preview";

import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { audit } from "@/lib/audit";
import {
  importColumnCoverage,
  importPreview,
  mappingError,
  uncoveredImportColumns,
} from "@/lib/crm-b2b/import-preview";
import { processCompaniesPeopleImport } from "@/lib/crm-b2b/import-process";
import { importColumnMappingSchema } from "@/lib/crm-b2b/schemas";
import {
  IMPORT_MAX_BYTES,
  isCsvFilename,
  isXlsxFilename,
  isXlsmFilename,
  parseImportFile,
  suggestColumnMapping,
  type MappingField,
} from "@/lib/crm-b2b/spreadsheet";
import {
  fail,
  handleRouteError,
  ok,
  requestIdOf,
  seModuloB2bDesligado,
} from "@/lib/crm-b2b/route-helpers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/imports — lista lotes da org.
 * POST /api/v1/imports — upload CSV/XLSX + processa companies/people/contacts.
 *
 * O importador histórico de contatos (`/api/v1/contacts/import`) permanece.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = requestIdOf(req);
  const desligado = await seModuloB2bDesligado(requestId);
  if (desligado) return desligado;
  const authz = await requireRole("viewer", { requestId, resource: "imports" });
  if (!authz.ok) return authz.response;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("import_batches")
      .select(
        "id, filename, status, kind, total_rows, processed_rows, successful_rows, failed_rows, conflict_rows, created_by, created_at, completed_at",
      )
      .eq("organization_id", authz.org.orgId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return fail("internal_error", error.message, 500, { requestId });
    return ok(data ?? [], { requestId });
  } catch (e) {
    return handleRouteError(e, requestId);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = requestIdOf(req);
  const desligado = await seModuloB2bDesligado(requestId);
  if (desligado) return desligado;
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "imports" });
  if (!authz.ok) return authz.response;

  try {
    let form: FormData;
    try {
      form = await readImportForm(req);
    } catch (error) {
      const large = error instanceof Error && error.message === "import_body_limit";
      return fail(
        "validation_failed",
        large ? "Solicitação de importação grande demais." : "Upload inválido.",
        large ? 413 : 422,
        { requestId },
      );
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("validation_failed", "Envie o arquivo no campo 'file'.", 422, { requestId });
    }
    const nome = file.name ?? "import.csv";
    if (!isCsvFilename(nome) && !isXlsxFilename(nome) && !isXlsmFilename(nome)) {
      return fail(
        "validation_failed",
        "Formato não suportado — envie .csv, .xlsx ou .xlsm para análise.",
        422,
        {
          requestId,
        },
      );
    }
    if (file.size > IMPORT_MAX_BYTES) {
      return fail("validation_failed", "Arquivo grande demais.", 422, { requestId });
    }
    if (isXlsmFilename(nome) && form.get("preview") !== "true") {
      return fail(
        "validation_failed",
        "XLSM está disponível somente para análise. A carga integral exige lotes revisados e recuperação validada; nenhum cadastro foi criado.",
        422,
        { requestId },
      );
    }
    const worksheet = form.get("worksheet");
    if (
      worksheet !== null &&
      (typeof worksheet !== "string" || !worksheet || worksheet.length > 100)
    ) {
      return fail("validation_failed", "Aba inválida.", 422, { requestId });
    }

    let mapping: Partial<Record<MappingField, string>> = {};
    const mappingRaw = form.get("mapping");
    if (typeof mappingRaw === "string" && mappingRaw.trim()) {
      try {
        mapping = importColumnMappingSchema.parse(JSON.parse(mappingRaw));
      } catch {
        return fail("validation_failed", "Mapeamento inválido.", 422, { requestId });
      }
    }

    const bytes = await file.arrayBuffer();
    const parsed = await parseImportFile(
      bytes,
      nome,
      typeof worksheet === "string" ? worksheet : undefined,
    );
    if (!parsed.ok) {
      return fail("validation_failed", parsed.error, 422, { requestId });
    }

    if (!mappingRaw) {
      mapping = suggestColumnMapping(parsed.sheet.headers);
    }

    const headerError = mappingError(
      parsed.sheet.headers,
      suggestColumnMapping(parsed.sheet.headers),
    );
    // A análise permite cabeçalhos desconhecidos: o usuário os relaciona na tela.
    if (
      headerError &&
      (parsed.sheet.headers.some((h) => !h) ||
        new Set(parsed.sheet.headers).size !== parsed.sheet.headers.length)
    ) {
      return fail("validation_failed", headerError, 422, { requestId });
    }
    const sourceHash = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
    const reviewRaw = form.get("historical_review");
    const historicalConfirm = form.get("historical_confirm");
    if (reviewRaw !== null && form.get("preview") !== "true") {
      if (historicalConfirm !== "true")
        return fail("validation_failed", "Confirme explicitamente a importação histórica.", 422, {
          requestId,
        });
      if (req.headers.get("origin") !== new URL(req.url).origin)
        return fail("forbidden", "Origem inválida.", 403, { requestId });
      if (typeof reviewRaw !== "string" || reviewRaw.length > IMPORT_MAX_BYTES)
        return fail("validation_failed", "Revisão inválida ou grande demais.", 422, { requestId });
      let review: unknown;
      try {
        review = JSON.parse(reviewRaw);
      } catch {
        return fail("validation_failed", "Revisão inválida.", 422, { requestId });
      }
      const command = prepareHistoricalCommand(parsed.sheet, sourceHash, nome, review);
      if (!command.ok) return fail("validation_failed", command.error, 422, { requestId });
      try {
        const result = await confirmHistoricalImport(
          await createClient(),
          authz.org.orgId,
          command.data,
        );
        if (!result.ok)
          return fail(result.error.code, result.error.message, result.error.status, { requestId });
        // SQL commits receipt, all rows and audit together. No separate audit write.
        return ok(result.data, {
          requestId,
          status: result.data.reused ? 200 : 201,
          headers: { "cache-control": "private, no-store" },
        });
      } catch {
        return fail(
          "internal_error",
          "Não foi possível conferir o recibo. Reenvie o mesmo arquivo e as mesmas decisões.",
          500,
          { requestId },
        );
      }
    }
    if (historicalConfirm === "true" && reviewRaw === null)
      return fail("validation_failed", "A revisão histórica é obrigatória.", 422, { requestId });
    if (form.get("preview") === "true") {
      const pageRaw = form.get("historical_page");
      let historicalPage = null;
      if (pageRaw !== null) {
        if (typeof pageRaw !== "string" || !/^[1-9][0-9]{0,2}$/.test(pageRaw))
          return fail("validation_failed", "Página histórica inválida.", 422, { requestId });
        const page = Number(pageRaw);
        const totalPages = Math.max(1, Math.ceil(parsed.sheet.rows.length / 25));
        if (page > totalPages)
          return fail("validation_failed", "Página histórica inexistente.", 422, { requestId });
        const extracted = historicalRowsForReview(parsed.sheet);
        historicalPage = {
          page,
          page_size: 25,
          total_pages: totalPages,
          rows: extracted.rows.slice((page - 1) * 25, page * 25),
        };
      }
      let reviewedDraft = null;
      if (reviewRaw !== null) {
        if (typeof reviewRaw !== "string" || reviewRaw.length > IMPORT_MAX_BYTES)
          return fail("validation_failed", "Revisão inválida ou grande demais.", 422, {
            requestId,
          });
        let input: unknown;
        try {
          input = JSON.parse(reviewRaw);
        } catch {
          return fail("validation_failed", "Revisão inválida.", 422, { requestId });
        }
        const result = validateHistoricalReview(parsed.sheet, sourceHash, input);
        if (!result.ok) return fail("validation_failed", result.error, 422, { requestId });
        // Full raw rows stay in memory; do not duplicate the file in the response/logs.
        const { rows, ...summary } = result.data;
        reviewedDraft = { ...summary, sample: rows.slice(0, 5) };
      }
      return ok(
        {
          ...importPreview(parsed.sheet, mapping),
          source_sha256: sourceHash,
          reviewed_draft: reviewedDraft,
          historical_page: historicalPage,
          ...(parsed.workbook ? { workbook: parsed.workbook } : {}),
        },
        { requestId },
      );
    }
    const invalidMapping = mappingError(parsed.sheet.headers, mapping);
    if (invalidMapping) return fail("validation_failed", invalidMapping, 422, { requestId });
    if ((historicalPreview(parsed.sheet)?.blocked_columns.length ?? 0) > 0)
      return fail(
        "validation_failed",
        "Esta planilha contém endereços ou histórico de serviços. A prévia está disponível, mas a importação desses dados ainda não está habilitada. Nenhum cadastro foi criado.",
        422,
        { requestId },
      );
    if (uncoveredImportColumns(importColumnCoverage(parsed.sheet), mapping).length > 0)
      return fail(
        "validation_failed",
        "Há colunas preenchidas sem destino. Revise o mapeamento; endereço e histórico de serviços precisam de um fluxo próprio antes da importação. Nenhum cadastro foi criado.",
        422,
        { requestId },
      );

    const supabase = await createClient();
    const summary = await processCompaniesPeopleImport(supabase, {
      organizationId: authz.org.orgId,
      filename: nome,
      sheet: parsed.sheet,
      mapping,
      requestId,
    });

    if (!summary.reused)
      await audit({
        organizationId: authz.org.orgId,
        actorUserId: authz.user.id,
        action: "imports.companies_people",
        resourceType: "import_batches",
        resourceId: summary.batch_id,
        requestId,
        metadata: summary as unknown as Record<string, unknown>,
      });

    return ok(
      {
        suggested_mapping: suggestColumnMapping(parsed.sheet.headers),
        headers: parsed.sheet.headers,
        ...summary,
      },
      { requestId, status: summary.reused ? 200 : 201 },
    );
  } catch (e) {
    return handleRouteError(e, requestId);
  }
}
