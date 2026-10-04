import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { lerJsonLimitado, previaSchema } from "@/lib/documentos/previa";
import { validarPngDaAssinatura } from "@/lib/documentos/png";
import { renderizarPrevia } from "@/lib/documentos/previa-pdf";
import { lerArquivo, listarArquivos, salvarArquivo } from "@/lib/documentos/arquivos";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Archives can contain signature images and customer PII: same admin access as models.
async function contatoDisponivel(id: string | null, org: string) {
  if (!id) return true;
  const db = await createClient();
  const { data, error } = await db
    .from("contacts")
    .select("id")
    .eq("organization_id", org)
    .eq("id", id)
    .eq("is_anonymized", false)
    .maybeSingle();
  return !error && !!data;
}
export async function GET(request: Request) {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "document_archive" });
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const query = z
      .strictObject({
        id: z.uuid().optional(),
        offset: z.coerce.number().int().min(0).max(10000).default(0),
      })
      .parse(Object.fromEntries(url.searchParams));
    if ([...url.searchParams.keys()].some((k) => url.searchParams.getAll(k).length > 1))
      throw Error("query");
    const db = createAdminClient();
    if (query.id) {
      const { arquivo, pdf } = await lerArquivo(db, auth.org.orgId, query.id);
      if (!(await contatoDisponivel(arquivo.contactId, auth.org.orgId)))
        return fail("not_found", "Arquivo indisponível para este contato.", 404, { requestId });
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="documento-${query.id}.pdf"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": requestId,
        },
      });
    }
    const list = await listarArquivos(db, auth.org.orgId, query.offset);
    const documentos = [];
    for (const item of list.documentos)
      if (await contatoDisponivel(item.contactId, auth.org.orgId)) documentos.push(item);
    return ok(
      { ...list, documentos },
      { requestId, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return fail("validation_failed", "Não foi possível consultar o arquivo privado.", 422, {
      requestId,
    });
  }
}
export async function POST(request: Request) {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "document_archive" });
  if (!auth.ok) return auth.response;
  const denied = await requireSupportWrite();
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return fail("forbidden", "Origem inválida.", 403, { requestId });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return fail("validation_failed", "Envie JSON.", 415, { requestId });
  try {
    const input = z
      .strictObject({
        id: z.uuid(),
        documento: previaSchema,
        contact_id: z.uuid().nullable().default(null),
      })
      .parse(await lerJsonLimitado(request));
    if (!(await contatoDisponivel(input.contact_id, auth.org.orgId)))
      return fail("not_found", "Contato indisponível.", 404, { requestId });
    input.documento.assinaturas.forEach((s) => validarPngDaAssinatura(s.png));
    const pdf = await renderizarPrevia(input.documento, auth.org.name);
    const saved = await salvarArquivo(createAdminClient(), auth.org.orgId, {
      id: input.id,
      titulo: input.documento.titulo,
      destinatario: input.documento.destinatario,
      criadoEm: new Date().toISOString(),
      criadoPor: auth.user.id,
      contactId: input.contact_id,
      pedidoSha256: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
      sha256: createHash("sha256").update(pdf).digest("hex"),
      pdf: Buffer.from(pdf).toString("base64"),
    });
    if (!saved.repetido)
      await audit({
        action: "document.created",
        organizationId: auth.org.orgId,
        actorUserId: auth.user.id,
        resourceType: "document_archive",
        resourceId: input.id,
        requestId,
        bypassedRls: true,
        metadata: { format: "pdf", kind: "preview_snapshot" },
      });
    return ok(saved, { requestId, status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail(
      "validation_failed",
      "Não foi possível arquivar. Confira os campos, o tamanho e o Storage privado.",
      422,
      { requestId },
    );
  }
}
