import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { fail, ok, requestIdOf, seModuloB2bDesligado } from "@/lib/crm-b2b/route-helpers";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Ctx): Promise<Response> {
  const requestId = requestIdOf(req),
    off = await seModuloB2bDesligado(requestId);
  if (off) return off;
  const id = z.uuid().safeParse((await params).id);
  const query = z
    .strictObject({
      status: z.enum(["pending", "success", "error", "conflict"]).optional(),
      after: z
        .string()
        .regex(/^(0|[1-9][0-9]{0,3})$/)
        .optional(),
    })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (
    !id.success ||
    !query.success ||
    [...req.nextUrl.searchParams.keys()].some((k) => req.nextUrl.searchParams.getAll(k).length > 1)
  )
    return fail("validation_failed", "Consulta de lote inválida.", 422, { requestId });
  const authz = await requireRole("viewer", { requestId, resource: "imports" });
  if (!authz.ok) return authz.response;
  try {
    const db = await createClient();
    const { data: batch, error } = await db
      .from("import_batches")
      .select("*")
      .eq("organization_id", authz.org.orgId)
      .eq("id", id.data)
      .maybeSingle();
    if (error)
      return fail("internal_error", "Não foi possível carregar o lote.", 500, { requestId });
    if (!batch) return fail("not_found", "Importação não encontrada.", 404, { requestId });
    let q = db
      .from("import_rows")
      .select(
        "id, row_number, status, error, company_id, person_id, contact_id, raw_data, normalized_data, created_at",
      )
      .eq("organization_id", authz.org.orgId)
      .eq("batch_id", id.data)
      .gt("row_number", Number(query.data.after ?? 0))
      .order("row_number", { ascending: true })
      .limit(51);
    if (query.data.status) q = q.eq("status", query.data.status);
    const result = await q;
    if (result.error)
      return fail(
        "internal_error",
        "Não foi possível carregar todas as linhas desta página.",
        500,
        { requestId },
      );
    const rows = (result.data ?? []).slice(0, 50);
    let receipt = null;
    if (batch.kind === "limpax_history") {
      const response = await db
        .from("limpax_history_receipts")
        .select(
          "id, source_sha256, total_rows, service_rows, locations_created, auxiliary_rows, reversed_at, created_at",
        )
        .eq("organization_id", authz.org.orgId)
        .eq("batch_id", id.data)
        .maybeSingle();
      if (response.error || !response.data)
        return fail("internal_error", "O recibo histórico não pôde ser conferido.", 500, {
          requestId,
        });
      receipt = response.data;
    }
    return ok(
      {
        batch,
        rows,
        receipt,
        page_size: 50,
        next_after: (result.data?.length ?? 0) > 50 ? (rows.at(-1)?.row_number ?? null) : null,
        can_reverse: authz.org.role === "admin" && receipt !== null && receipt.reversed_at === null,
      },
      { requestId, headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return fail("internal_error", "Não foi possível carregar a importação.", 500, { requestId });
  }
}
