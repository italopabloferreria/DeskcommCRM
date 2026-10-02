import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { readHistoryJson } from "@/lib/crm-b2b/history-management";
import {
  historicalImportError,
  historyReversalSchema,
  historyReversalReceiptSchema,
} from "@/lib/crm-b2b/historical-process";
import { fail, ok, requestIdOf, seModuloB2bDesligado } from "@/lib/crm-b2b/route-helpers";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = requestIdOf(request),
    off = await seModuloB2bDesligado(requestId);
  if (off) return off;
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return fail("forbidden", "Origem inválida.", 403, { requestId });
  const support = await requireSupportWrite();
  if (support) return support;
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return fail("validation_failed", "Lote inválido.", 422, { requestId });
  const authz = await requireRole("admin", { requestId, resource: "imports" });
  if (!authz.ok) return authz.response;
  let body;
  try {
    body = historyReversalSchema.parse(await readHistoryJson(request));
  } catch {
    return fail("validation_failed", "Confirmação inválida ou grande demais.", 422, { requestId });
  }
  try {
    const db = await createClient();
    const result = await db.rpc("fn_limpax_history_reverse_batch", {
      p_org: authz.org.orgId,
      p_batch: id.data,
      p_body: body,
    });
    if (result.error) {
      const e = historicalImportError(result.error);
      return fail(e.code, e.message, e.status, { requestId });
    }
    const receipt = historyReversalReceiptSchema.safeParse(result.data);
    if (!receipt.success)
      return fail(
        "internal_error",
        "O banco não confirmou a reversão. Confira o lote antes de tentar novamente.",
        500,
        { requestId },
      );
    return ok(receipt.data, { requestId, headers: { "cache-control": "private, no-store" } });
  } catch {
    return fail(
      "internal_error",
      "Não foi possível concluir a reversão. Tente novamente com a mesma confirmação.",
      500,
      { requestId },
    );
  }
}
