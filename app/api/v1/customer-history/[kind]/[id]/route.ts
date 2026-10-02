import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { audit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import {
  historyCommandSchema,
  historySqlError,
  readHistoryJson,
} from "@/lib/crm-b2b/history-management";
import { fail, ok, requestIdOf, seModuloB2bDesligado } from "@/lib/crm-b2b/route-helpers";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ kind: string; id: string }> };
const resource = z.object({
  kind: z.enum(["person", "company", "service"]),
  id: z.string().uuid(),
});
export async function GET(request: Request, context: Context) {
  const requestId = requestIdOf(request);
  const off = await seModuloB2bDesligado(requestId);
  if (off) return off;
  const parsed = resource.safeParse(await context.params);
  const url = new URL(request.url);
  const query = z
    .object({ after: z.string().uuid().optional(), export: z.literal("person").optional() })
    .strict()
    .safeParse(Object.fromEntries(url.searchParams));
  if (
    !query.success ||
    [...url.searchParams.keys()].some((key) => url.searchParams.getAll(key).length > 1)
  )
    return fail("validation_failed", "Consulta inválida.", 422, { requestId });
  const exporting = query.data.export === "person";
  if (
    !parsed.success ||
    parsed.data.kind === "service" ||
    (exporting && parsed.data.kind !== "person")
  )
    return fail("validation_failed", "Recurso inválido.", 422, { requestId });
  const authz = await requireRole(exporting ? "admin" : "viewer", {
    requestId,
    resource: "customer_history",
  });
  if (!authz.ok) return authz.response;
  const after = query.data.after ?? null;
  try {
    const db = await createClient();
    const result = exporting
      ? await db.rpc("fn_limpax_history_export_person", {
          p_org: authz.org.orgId,
          p_id: parsed.data.id,
        })
      : await db.rpc("fn_limpax_history_view", {
          p_org: authz.org.orgId,
          p_kind: parsed.data.kind,
          p_id: parsed.data.id,
          p_after: after,
        });
    if (result.error) {
      const error = historySqlError(result.error);
      if (!exporting && error.code === "history_not_installed")
        return ok(
          {
            available: false,
            items: [],
            can_correct: false,
            can_void: false,
            can_redact: false,
            redacted: false,
          },
          { requestId },
        );
      return fail(error.code, error.message, error.status, { requestId });
    }
    if (exporting) {
      await audit({
        organizationId: authz.org.orgId,
        actorUserId: authz.user.id,
        action: "lgpd.export_generated",
        resourceType: "person",
        resourceId: parsed.data.id,
        requestId,
        metadata: { scope: "person_profile_and_history" },
      });
    }
    return ok(result.data, { requestId, headers: { "cache-control": "private, no-store" } });
  } catch {
    return fail("internal_error", "Não foi possível carregar o histórico.", 500, { requestId });
  }
}
export async function POST(request: Request, context: Context) {
  const requestId = requestIdOf(request);
  const off = await seModuloB2bDesligado(requestId);
  if (off) return off;
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return fail("forbidden", "Origem inválida.", 403, { requestId });
  const support = await requireSupportWrite();
  if (support) return support;
  const parsed = resource.safeParse(await context.params);
  if (!parsed.success || parsed.data.kind === "company")
    return fail("validation_failed", "Recurso inválido.", 422, { requestId });
  let command;
  try {
    command = historyCommandSchema.parse(await readHistoryJson(request));
  } catch (error) {
    return fail(
      "validation_failed",
      error instanceof Error && error.message === "history_body_limit"
        ? "Solicitação grande demais."
        : "Dados inválidos.",
      error instanceof Error && error.message === "history_body_limit" ? 413 : 422,
      { requestId },
    );
  }
  if ((command.action === "redact_person") !== (parsed.data.kind === "person"))
    return fail("validation_failed", "Comando incompatível com o recurso.", 422, { requestId });
  const authz = await requireRole(command.action === "correct" ? "manager" : "admin", {
    requestId,
    resource: "customer_history",
  });
  if (!authz.ok) return authz.response;
  try {
    const db = await createClient();
    const result = await db.rpc("fn_limpax_history_manage", {
      p_org: authz.org.orgId,
      p_kind: parsed.data.kind,
      p_id: parsed.data.id,
      p_body: command,
    });
    if (result.error) {
      const e = historySqlError(result.error);
      return fail(e.code, e.message, e.status, { requestId });
    }
    // Mutation and ID/count-only audit are committed together by the SQL command.
    return ok(result.data, { requestId, headers: { "cache-control": "private, no-store" } });
  } catch {
    return fail("internal_error", "Não foi possível concluir a operação.", 500, { requestId });
  }
}
