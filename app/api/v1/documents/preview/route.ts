import { randomUUID } from "node:crypto";
import { fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerJsonLimitado, previaSchema } from "@/lib/documentos/previa";
import { validarPngDaAssinatura } from "@/lib/documentos/png";
import { renderizarPrevia } from "@/lib/documentos/previa-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "documents_preview" });
  if (!authz.ok) return authz.response;
  // O navegador envia Origin; sem ela não existe prova de origem confiável.
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return fail("forbidden", "Origem do pedido inválida.", 403, { requestId });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return fail("validation_failed", "Envie um documento JSON.", 415, { requestId });
  let documento;
  try {
    documento = previaSchema.parse(await lerJsonLimitado(request));
    if (documento.assinaturas.length) {
      const admin = await requireRole("admin", {
        requestId,
        resource: "documents_signature_preview",
      });
      if (!admin.ok) return admin.response;
      if (admin.org.orgId !== authz.org.orgId)
        return fail("forbidden_tenant", "A organização mudou. Recarregue a página.", 403, {
          requestId,
        });
      documento.assinaturas.forEach((s) => validarPngDaAssinatura(s.png));
    }
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "documento_limite_corpo";
    return fail(
      "validation_failed",
      tooLarge
        ? "Documento excede 1 MB."
        : "Revise páginas, posições e PNG transparente RGBA (até 128 KB e 1024 × 512).",
      tooLarge ? 413 : 422,
      { requestId },
    );
  }
  try {
    const pdf = await renderizarPrevia(documento, authz.org.name);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="documento-previa.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
      },
    });
  } catch {
    return fail("internal_error", "Não foi possível gerar a prévia. Tente novamente.", 500, {
      requestId,
    });
  }
}
