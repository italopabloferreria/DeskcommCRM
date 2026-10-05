import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, requestIdOf } from "@/lib/crm-b2b/route-helpers";
import { reviewImportedIdentities, type ImportedIdentity } from "@/lib/crm-b2b/identity-review";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const requestId = requestIdOf(request);
  const auth = await requireRole("viewer", { resource: "imports", requestId });
  if (!auth.ok) return auth.response;
  try {
    const db = await createClient();
    const contacts: ImportedIdentity[] = [];
    let after: string | undefined;
    let complete = false;
    // The hosted API caps pages at 1000. Never mistake that cap for full coverage.
    for (let page = 0; page < 10; page++) {
      let query = db
        .from("contacts")
        .select("id,organization_id,name,is_anonymized,is_merged_into,source_metadata")
        .eq("organization_id", auth.org.orgId)
        .eq("kind", "person")
        .eq("is_anonymized", false)
        .is("is_merged_into", null)
        .not("source_metadata->workbook_origin", "is", null)
        .order("id", { ascending: true })
        .limit(1000);
      if (after) query = query.gt("id", after);
      const { data, error } = await query;
      if (error) throw new Error("identity_review_read_failed");
      const rows = (data ?? []) as ImportedIdentity[];
      contacts.push(...rows);
      if (rows.length < 1000) {
        complete = true;
        break;
      }
      after = rows.at(-1)!.id;
    }
    return ok(
      { ...reviewImportedIdentities(contacts, auth.org.orgId), complete, automatic_merges: false },
      {
        requestId,
        headers: { "cache-control": "private, no-store" },
      },
    );
  } catch {
    return fail("internal_error", "Não foi possível concluir a revisão da base.", 500, {
      requestId,
    });
  }
}
