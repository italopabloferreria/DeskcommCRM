import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, requestIdOf } from "@/lib/crm-b2b/route-helpers";
import { savedWorkbookRow } from "@/lib/crm-b2b/saved-workbook-row";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdOf(req);
  const id = z.uuid().safeParse((await ctx.params).id);
  const query = z
    .strictObject({ offset: z.coerce.number().int().min(0).max(100000).default(0) })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!id.success || !query.success || req.nextUrl.searchParams.getAll("offset").length > 1)
    return fail("validation_failed", "Consulta inválida.", 422, { requestId });
  const authz = await requireRole("viewer", { resource: "contacts", requestId });
  if (!authz.ok) return authz.response;
  try {
    const db = await createClient();
    const { data: contact, error } = await db
      .from("contacts")
      .select("id,is_anonymized")
      .eq("organization_id", authz.org.orgId)
      .eq("id", id.data)
      .maybeSingle();
    if (error)
      return fail("internal_error", "Não foi possível consultar o contato.", 500, { requestId });
    if (!contact || contact.is_anonymized)
      return fail("not_found", "Origem indisponível para este contato.", 404, { requestId });
    const { data, error: rowsError } = await db
      .from("import_rows")
      .select("id,batch_id,row_number,raw_data")
      .eq("organization_id", authz.org.orgId)
      .eq("contact_id", id.data)
      .order("id")
      .range(query.data.offset, query.data.offset + 50);
    if (rowsError)
      return fail("internal_error", "Não foi possível carregar o histórico da planilha.", 500, {
        requestId,
      });
    return ok(
      {
        rows: (data ?? [])
          .slice(0, 50)
          .map((row) => ({
            id: row.id,
            batch_id: row.batch_id,
            source: savedWorkbookRow(row.raw_data),
          })),
        next_offset: (data?.length ?? 0) > 50 ? query.data.offset + 50 : null,
      },
      { requestId, headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return fail("internal_error", "Não foi possível carregar o histórico da planilha.", 500, {
      requestId,
    });
  }
}
