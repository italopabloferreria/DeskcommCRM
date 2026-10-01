import { type NextRequest } from "next/server";

import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { audit } from "@/lib/audit";
import { importPreview, mappingError } from "@/lib/crm-b2b/import-preview";
import { processCompaniesPeopleImport } from "@/lib/crm-b2b/import-process";
import { importColumnMappingSchema } from "@/lib/crm-b2b/schemas";
import {
  IMPORT_MAX_BYTES,
  isCsvFilename,
  isXlsxFilename,
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
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("validation_failed", "Envie o arquivo no campo 'file'.", 422, { requestId });
    }
    const nome = file.name ?? "import.csv";
    if (!isCsvFilename(nome) && !isXlsxFilename(nome)) {
      return fail("validation_failed", "Formato não suportado — envie .csv ou .xlsx.", 422, {
        requestId,
      });
    }
    if (file.size > IMPORT_MAX_BYTES) {
      return fail("validation_failed", "Arquivo grande demais.", 422, { requestId });
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
    const parsed = await parseImportFile(bytes, nome);
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
    if (form.get("preview") === "true")
      return ok(importPreview(parsed.sheet, mapping), { requestId });
    const invalidMapping = mappingError(parsed.sheet.headers, mapping);
    if (invalidMapping) return fail("validation_failed", invalidMapping, 422, { requestId });

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
