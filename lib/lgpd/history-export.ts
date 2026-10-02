import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const scope = {
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  person_id: z.string().uuid(),
};
const locationSchema = z.object({
  ...scope,
  address_original: z.string(),
  created_at: z.string(),
  redacted_at: z.string().nullable(),
});
const serviceSchema = z.object({
  ...scope,
  location_id: z.string().uuid().nullable(),
  import_row_id: z.string().uuid(),
  original_reference: z.unknown(),
  raw_data: z.unknown(),
  service_date: z.string().nullable(),
  value_cents: z.union([z.number().int().safe(), z.string().regex(/^\d+$/)]).nullable(),
  currency: z.string().nullable(),
  notes_original: z.string(),
  notes_current: z.string().nullable().optional(),
  revision: z.number().int().nonnegative().optional(),
  voided_at: z.string().nullable().optional(),
  created_at: z.string(),
  redacted_at: z.string().nullable(),
});
export interface HistorySubjectExport {
  locais: Array<z.infer<typeof locationSchema>>;
  servicos: Array<z.infer<typeof serviceSchema>>;
}
type HistoryPageReader = (
  columns: string, first: number, last: number,
) => Promise<{ data: unknown[] | null; error: unknown }>;
const PAGE = 250;
const MAX_ROWS = 10000;
const MAX_BYTES = 16 * 1024 * 1024;

/** Called by the existing authorized export worker, never by a browser.
 * A historical batch is the installation's evidence of stored history.
 * Errors and limits fail the entire export; they are never mistaken for no data.
 */
export async function collectHistorySubject(
  admin: SupabaseClient,
  organizationId: string,
  personId: string,
  tables: {
    locations: HistoryPageReader;
    services: HistoryPageReader;
  } = {
    locations: async (columns, first, last) => {
      const result = await admin
        .from("limpax_customer_locations")
        .select(columns)
        .eq("organization_id", organizationId)
        .eq("person_id", personId)
        .order("id", { ascending: true })
        .range(first, last);
      return { data: result.data, error: result.error };
    },
    services: async (columns, first, last) => {
      const result = await admin
        .from("limpax_service_history")
        .select(columns)
        .eq("organization_id", organizationId)
        .eq("person_id", personId)
        .order("id", { ascending: true })
        .range(first, last);
      return { data: result.data, error: result.error };
    },
  },
): Promise<HistorySubjectExport | undefined> {
  z.string().uuid().parse(organizationId);
  z.string().uuid().parse(personId);
  const batch = await admin
    .from("import_batches")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("kind", "limpax_history")
    .limit(1);
  if (batch.error) throw new Error("history_export_presence_failed");
  if (!batch.data?.length) return undefined;

  let bytes = 0;
  async function read<T>(
    query: HistoryPageReader,
    columns: string,
    schema: z.ZodType<T>,
  ) {
    const rows: T[] = [];
    for (let start = 0; start <= MAX_ROWS;) {
      const result = await query(columns, start, start + PAGE - 1);
      if (result.error || !Array.isArray(result.data))
        throw new Error("history_export_read_failed");
      if (result.data.length > PAGE || rows.length + result.data.length > MAX_ROWS)
        throw new Error("history_export_limit_exceeded");
      for (const value of result.data) {
        const parsed = schema.safeParse(value);
        if (!parsed.success) throw new Error("history_export_invalid_record");
        const record = parsed.data as T & { organization_id: string; person_id: string };
        if (record.organization_id !== organizationId || record.person_id !== personId)
          throw new Error("history_export_scope_mismatch");
        bytes += Buffer.byteLength(JSON.stringify(record), "utf8");
        if (bytes > MAX_BYTES) throw new Error("history_export_size_exceeded");
        rows.push(record);
      }
      // Empty terminal page avoids treating a server-side row cap as completion.
      if (result.data.length === 0) return rows;
      start += result.data.length;
    }
    throw new Error("history_export_limit_exceeded");
  }
  return {
    locais: await read(
      tables.locations,
      "id,organization_id,person_id,address_original,created_at,redacted_at",
      locationSchema,
    ),
    servicos: await read(
      tables.services,
      "id,organization_id,person_id,location_id,import_row_id,original_reference,raw_data,service_date,value_cents,currency,notes_original,notes_current,revision,voided_at,created_at,redacted_at",
      serviceSchema,
    ),
  };
}
