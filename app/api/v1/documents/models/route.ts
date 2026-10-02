import { randomUUID } from "node:crypto";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { modeloSchema } from "@/lib/documentos/modelos";
import { lerJsonLimitado } from "@/lib/documentos/previa";
import { lerModelo, listarModelos, salvarModelo } from "@/lib/documentos/acervo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "document_models" });
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url),
      id = url.searchParams.get("id"),
      versao = url.searchParams.get("versao");
    if (Boolean(id) !== Boolean(versao)) throw new Error("modelo_versao_obrigatoria");
    const db = createAdminClient();
    const data =
      id && versao
        ? await lerModelo(db, auth.org.orgId, id, versao)
        : await listarModelos(db, auth.org.orgId, Number(url.searchParams.get("offset") ?? 0));
    return ok(data, { requestId, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail(
      "validation_failed",
      "Não foi possível ler o acervo privado. Confira a configuração ou a versão selecionada.",
      422,
      { requestId },
    );
  }
}
export async function POST(request: Request) {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "document_models" });
  if (!auth.ok) return auth.response;
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return fail("forbidden", "Origem inválida.", 403, { requestId });
  const denied = await requireSupportWrite();
  if (denied) return denied;
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return fail("validation_failed", "Envie JSON.", 415, { requestId });
  try {
    const modelo = modeloSchema.parse(await lerJsonLimitado(request));
    const saved = await salvarModelo(createAdminClient(), auth.org.orgId, modelo, auth.user.id);
    if (!saved.repetido)
      await audit({
        action: "template.created",
        organizationId: auth.org.orgId,
        actorUserId: auth.user.id,
        resourceType: "document_models",
        resourceId: modelo.id,
        requestId,
        bypassedRls: true,
        metadata: { versao: saved.versao },
      });
    return ok(saved, { requestId, status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail(
      "validation_failed",
      "Não foi possível salvar. Revise o modelo, confirme a revisão do OCR e verifique o Storage privado.",
      422,
      { requestId },
    );
  }
}
