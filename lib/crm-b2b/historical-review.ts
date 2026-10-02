import { z } from "zod";
import { historicalDate, historicalRowsForReview, historicalValue } from "./historical-preview";
import { IMPORT_MAX_DATA_ROWS, type SheetMatrix } from "./spreadsheet";

const customerSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("company"), id: z.uuid() }),
  z.strictObject({ kind: z.literal("person"), id: z.uuid() }),
]);
const locationSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("create_from_original") }),
  z.strictObject({ kind: z.literal("existing"), id: z.uuid() }),
]);
const decisionSchema = z.strictObject({
  data_row_index: z.number().int().min(1).max(IMPORT_MAX_DATA_ROWS),
  customer: customerSchema,
  location: locationSchema,
  accept_original_date: z.boolean(),
  accept_original_value: z.boolean(),
});
export const historicalReviewSchema = z.strictObject({
  source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  decisions: z.array(decisionSchema).max(IMPORT_MAX_DATA_ROWS),
});

/** Draft only: UUID shape is not authorization or proof that an entity exists. */
export function validateHistoricalReview(
  sheet: SheetMatrix,
  actualSourceHash: string,
  input: unknown,
) {
  const parsed = historicalReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Decisões de revisão inválidas." };
  if (parsed.data.source_sha256 !== actualSourceHash)
    return {
      ok: false as const,
      error: "As decisões pertencem a outro arquivo. Analise novamente.",
    };
  const extracted = historicalRowsForReview(sheet);
  if (extracted.ambiguous_fields.length)
    return {
      ok: false as const,
      error: "Resolva os cabeçalhos ambíguos antes de revisar os vínculos.",
    };
  const decisions = new Map<number, z.infer<typeof decisionSchema>>();
  for (const decision of parsed.data.decisions) {
    if (decision.data_row_index > sheet.rows.length || decisions.has(decision.data_row_index))
      return { ok: false as const, error: "Linha inexistente ou decisão repetida na revisão." };
    decisions.set(decision.data_row_index, decision);
  }
  const rows = extracted.rows.map((row) => {
    const decision = decisions.get(row.data_row_index);
    const value = historicalValue(row.raw.value);
    const date = historicalDate(row.raw.service_date);
    const hasAddress = row.raw.address.trim() !== "";
    const operational =
      hasAddress ||
      [row.raw.value, row.raw.service_date, row.raw.notes].some((cell) => cell.trim() !== "");
    const issues: string[] = [];
    if (operational && !decision) issues.push("customer_decision_required");
    if (decision && hasAddress && decision.location.kind === "none")
      issues.push("populated_address_requires_location");
    if (decision && !hasAddress && decision.location.kind === "create_from_original")
      issues.push("missing_address_cannot_create_location");
    if (operational && value.status === "review") issues.push("value_requires_correction");
    if (operational && date.status === "review") issues.push("date_requires_correction");
    if (decision && value.status === "parsed" && !decision.accept_original_value)
      issues.push("value_acceptance_required");
    if (decision && date.status === "parsed" && !decision.accept_original_date)
      issues.push("date_acceptance_required");
    if (!operational && decision) issues.push("auxiliary_row_not_service");
    return {
      ...row,
      origin_key: `${actualSourceHash}:${row.data_row_index}`,
      customer: decision?.customer ?? null,
      location: decision?.location ?? null,
      value_cents: value.cents,
      service_date: date.date,
      issues,
      status: operational
        ? issues.length
          ? "review_required"
          : "draft_validated_pending_authorization"
        : "auxiliary_preserved",
    };
  });
  return {
    ok: true as const,
    data: {
      status: "draft_only_not_importable" as const,
      source_sha256: actualSourceHash,
      total_rows: rows.length,
      draft_validated_rows: rows.filter(
        (row) => row.status === "draft_validated_pending_authorization",
      ).length,
      review_required_rows: rows.filter((row) => row.status === "review_required").length,
      auxiliary_rows: rows.filter((row) => row.status === "auxiliary_preserved").length,
      ownership_verified: false as const,
      rows,
    },
  };
}
