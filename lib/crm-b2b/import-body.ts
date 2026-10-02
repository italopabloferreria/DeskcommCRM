import { IMPORT_MAX_BYTES } from "./spreadsheet";
/** File + review + bounded multipart headers. Content-Length is not proof. */
export const IMPORT_BODY_MAX_BYTES = IMPORT_MAX_BYTES * 2 + 65536;
export async function readImportForm(request: Request): Promise<FormData> {
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && BigInt(declared) > BigInt(IMPORT_BODY_MAX_BYTES))
    throw new Error("import_body_limit");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("import_invalid_body");
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > IMPORT_BODY_MAX_BYTES) {
        await reader.cancel();
        throw new Error("import_body_limit");
      }
      parts.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let cursor = 0;
  for (const part of parts) {
    bytes.set(part, cursor);
    cursor += part.byteLength;
  }
  return new Response(bytes, {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData();
}
