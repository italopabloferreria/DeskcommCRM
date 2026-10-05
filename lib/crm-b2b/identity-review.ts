import { canonicalPhoneBR } from "@/lib/channels/phone-variants";

export interface ImportedIdentity {
  id: string;
  organization_id: string;
  name: string | null;
  is_anonymized: boolean;
  is_merged_into: string | null;
  source_metadata: Record<string, unknown> | null;
}
const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");

/** Suggestions only. Equality of source fields never authorizes a merge. */
export function reviewImportedIdentities(contacts: ImportedIdentity[], organization: string) {
  const groups = new Map<
    string,
    { id: string; name: string; address: string; phone: string; sheet: string; row: number }[]
  >();
  let reviewed = 0;
  for (const contact of contacts) {
    if (contact.organization_id !== organization || contact.is_anonymized || contact.is_merged_into)
      continue;
    const meta = contact.source_metadata;
    const origin = meta?.workbook_origin;
    if (!origin || typeof origin !== "object" || Array.isArray(origin)) continue;
    const source = origin as Record<string, unknown>;
    if (
      typeof source.workbook_sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(source.workbook_sha256) ||
      typeof source.sheet !== "string" ||
      !Number.isInteger(source.row)
    )
      continue;
    reviewed++;
    const name = contact.name;
    const address = meta?.address_original;
    const phone = meta?.phone_original;
    if (
      !name ||
      !normalize(name) ||
      typeof address !== "string" ||
      !normalize(address) ||
      typeof phone !== "string" ||
      !/^\+?[\d\s().-]+$/.test(phone.trim())
    )
      continue;
    const digits = phone.replace(/\D/g, "");
    if (![10, 11, 12, 13].includes(digits.length)) continue;
    const international = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
    const canonical = canonicalPhoneBR(international).replace(/\D/g, "");
    if (!/^55[1-9]\d{9,10}$/.test(canonical)) continue;
    const key = JSON.stringify([
      source.workbook_sha256,
      normalize(name),
      normalize(address),
      canonical,
    ]);
    const members = groups.get(key) ?? [];
    members.push({
      id: contact.id,
      name,
      address,
      phone,
      sheet: source.sheet,
      row: source.row as number,
    });
    groups.set(key, members);
  }
  return {
    reviewed,
    groups: [...groups.values()]
      .filter((group) => group.length > 1)
      .map((contacts) => ({
        key: contacts.map((c) => c.id).sort()[0]!,
        contacts,
      })),
  };
}
