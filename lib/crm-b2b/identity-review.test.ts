import { describe, expect, it } from "vitest";
import { reviewImportedIdentities, type ImportedIdentity } from "./identity-review";
const org = "org-a";
function contact(id: string, overrides: Partial<ImportedIdentity> = {}): ImportedIdentity {
  return {
    id,
    organization_id: org,
    name: "Maria",
    is_anonymized: false,
    is_merged_into: null,
    source_metadata: {
      workbook_origin: { workbook_sha256: "a".repeat(64), sheet: "CADASTRO", row: 8 },
      address_original: "Rua Um 10",
      phone_original: "(61) 98227-4344",
    },
    ...overrides,
  };
}
describe("revisão conservadora de identidades importadas", () => {
  it("encontra candidatos mesmo quando o telefone operacional foi retido", () => {
    const result = reviewImportedIdentities([contact("a"), contact("b", { name: " MARIA " })], org);
    expect(result.reviewed).toBe(2);
    expect(result.groups[0]?.contacts.map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("não junta homônimos em endereços diferentes", () => {
    const other = contact("b");
    other.source_metadata!.address_original = "Rua Dois 20";
    expect(reviewImportedIdentities([contact("a"), other], org).groups).toEqual([]);
  });
  it("não atravessa organizações nem inclui contatos anonimados ou mesclados", () => {
    expect(
      reviewImportedIdentities(
        [
          contact("a"),
          contact("b", { organization_id: "org-b" }),
          contact("c", { is_anonymized: true }),
          contact("d", { is_merged_into: "a" }),
        ],
        org,
      ),
    ).toEqual({ reviewed: 1, groups: [] });
  });
  it("não interpreta dois telefones no mesmo campo como identidade", () => {
    const a = contact("a"),
      b = contact("b");
    for (const c of [a, b]) c.source_metadata!.phone_original = "61982274344 / 61999999999";
    expect(reviewImportedIdentities([a, b], org).groups).toEqual([]);
  });
  it("não cruza versões diferentes da planilha", () => {
    const other = contact("b");
    (other.source_metadata!.workbook_origin as Record<string, unknown>).workbook_sha256 =
      "b".repeat(64);
    expect(reviewImportedIdentities([contact("a"), other], org).groups).toEqual([]);
  });
  it("não altera origens nem contatos durante a revisão", () => {
    const input = [contact("a"), contact("b")],
      before = structuredClone(input);
    reviewImportedIdentities(input, org);
    expect(input).toEqual(before);
  });
});
