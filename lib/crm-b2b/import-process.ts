import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiError } from "@/lib/api/types";
import { normalizeCnpj, normalizePersonName } from "./normalize";
import { applyMapping, type MappingField, type SheetMatrix } from "./spreadsheet";
import { normalizePhoneBR } from "@/lib/webhooks/inbound";
import { phoneLookupVariants } from "@/lib/channels/phone-variants";

export interface ProcessImportOpts {
  organizationId: string;
  filename: string;
  sheet: SheetMatrix;
  mapping: Partial<Record<MappingField, string>>;
  requestId: string;
}
const summarySchema = z.object({
  batch_id: z.string().uuid(),
  successful_rows: z.number().int().nonnegative(),
  failed_rows: z.number().int().nonnegative(),
  conflict_rows: z.number().int().nonnegative(),
  processed_rows: z.number().int().nonnegative(),
  reused: z.boolean(),
});
export type ProcessImportResult = z.infer<typeof summarySchema>;

/** Só normalização em memória. Nenhuma escrita antes da RPC transacional. */
export function prepareImportRows(sheet: SheetMatrix, mapping: ProcessImportOpts["mapping"]) {
  return sheet.rows.map((row) => {
    const mapped = applyMapping(sheet.headers, row, mapping);
    const phone = mapped.phone ? normalizePhoneBR(mapped.phone) : null;
    const cnpj = mapped.cnpj ? normalizeCnpj(mapped.cnpj) : null;
    let validationError: string | null = null;
    if (mapped.phone && !phone) validationError = "Telefone inválido.";
    else if (mapped.cnpj && !cnpj) validationError = "CNPJ inválido.";
    else if (mapped.email && !z.email().safeParse(mapped.email).success)
      validationError = "E-mail inválido.";
    return {
      raw_data: Object.fromEntries(
        sheet.headers.map((header, index) => [header, row[index] ?? ""]),
      ),
      normalized_data: {
        ...mapped,
        phone_e164: phone,
        normalized_cnpj: cnpj,
        normalized_name: normalizePersonName(mapped.person_name),
        phone_variants: phone ? phoneLookupVariants(phone) : [],
      },
      validation_error: validationError,
    };
  });
}

export async function processCompaniesPeopleImport(
  db: SupabaseClient,
  opts: ProcessImportOpts,
): Promise<ProcessImportResult> {
  const { data, error } = await db.rpc("fn_import_companies_people_atomic", {
    p_organization_id: opts.organizationId,
    p_filename: opts.filename,
    p_mapping: opts.mapping,
    p_rows: prepareImportRows(opts.sheet, opts.mapping),
  });
  if (error) {
    if (["PGRST202", "42883"].includes(error.code))
      throw new ApiError(
        503,
        "import_unavailable",
        undefined,
        opts.requestId,
        "Importação segura ainda não instalada no banco. Nenhum cadastro foi criado.",
      );
    if (error.code === "55006")
      throw new ApiError(
        409,
        "import_in_progress",
        undefined,
        opts.requestId,
        "Outra importação está em andamento. Aguarde e tente novamente.",
      );
    if (error.code === "42501")
      throw new ApiError(
        403,
        "forbidden",
        undefined,
        opts.requestId,
        "Sem permissão para importar nesta organização.",
      );
    if (error.code === "22023")
      throw new ApiError(
        422,
        "validation_failed",
        undefined,
        opts.requestId,
        "Lote de importação inválido.",
      );
    throw new ApiError(
      500,
      "internal_error",
      undefined,
      opts.requestId,
      "Não foi possível confirmar a importação. Confira o histórico ou reenvie a mesma planilha; o banco evita repetir o lote.",
    );
  }
  const parsed = summarySchema.safeParse(data);
  if (!parsed.success)
    throw new ApiError(
      500,
      "internal_error",
      undefined,
      opts.requestId,
      "O banco não confirmou o resultado da importação. Confira o histórico antes de tentar novamente.",
    );
  return parsed.data;
}
