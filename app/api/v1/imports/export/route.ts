import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { EXPORTS, exportCsv, type ExportKind } from "@/lib/crm-b2b/export-csv";
import {
  fail,
  handleRouteError,
  requestIdOf,
  seModuloB2bDesligado,
} from "@/lib/crm-b2b/route-helpers";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = requestIdOf(req);
  const disabled = await seModuloB2bDesligado(requestId);
  if (disabled) return disabled;
  const authz = await requireRole("manager", { requestId, resource: "imports" });
  if (!authz.ok) return authz.response;
  const kind = req.nextUrl.searchParams.get("kind") ?? "companies";
  if (!Object.hasOwn(EXPORTS, kind))
    return fail("validation_failed", "Tipo de exportação inválido.", 422, { requestId });
  const selected = kind as ExportKind;
  try {
    const client = await createClient();
    const rows: Record<string, unknown>[] = [];
    // Páginas explícitas evitam o corte silencioso de 1.000 linhas do PostgREST.
    for (let offset = 0; offset <= 10_000; offset += 500) {
      let query = client
        .from(selected)
        .select(EXPORTS[selected].columns.join(","))
        .eq("organization_id", authz.org.orgId)
        .order("id")
        .range(offset, offset + 499);
      if (selected === "contacts") query = query.is("is_merged_into", null).eq("kind", "person");
      const { data, error } = await query;
      if (error) return fail("internal_error", error.message, 500, { requestId });
      rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      if (rows.length > 10_000)
        return fail(
          "validation_failed",
          "A exportação ultrapassa 10.000 registros. Solicite uma exportação em lotes.",
          422,
          { requestId },
        );
      if (!data || data.length < 500) break;
    }
    return new Response(exportCsv(selected, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="' +
          selected +
          "-" +
          new Date().toISOString().slice(0, 10) +
          '.csv"',
        "Cache-Control": "private, no-store",
        "X-Request-Id": requestId,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleRouteError(err, requestId);
  }
}
