import { describe, expect, it } from "vitest";
import { validateHistoricalReview } from "./historical-review";
const hash = "a".repeat(64);
const customer = { kind: "person", id: "11111111-1111-4111-8111-111111111111" };
const sheet = {
  headers: ["Nome", "Endereço", "Valor", "Data/Atend.", "Observação"],
  rows: [["Cliente fictício", "Rua fictícia", "0", "01/01/2024", "Serviço fictício"]],
};
const decision = {
  data_row_index: 1,
  customer,
  location: { kind: "create_from_original" },
  accept_original_date: true,
  accept_original_value: true,
};
const review = (decisions: unknown[] = [decision]) => ({ source_sha256: hash, decisions });
function valid(input: unknown = review(), source = sheet) {
  const result = validateHistoricalReview(source, hash, input);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
describe("decisões históricas explicitamente revisadas", () => {
  it("preserva origem, zero e dados brutos sem alegar autorização", () => {
    const data = valid();
    expect(data.draft_validated_rows).toBe(1);
    expect(data.rows[0]?.value_cents).toBe(0);
    expect(data.rows[0]?.origin_key).toBe(hash + ":1");
    expect(data.rows[0]?.raw_cells).toEqual(sheet.rows[0]);
    expect(data.ownership_verified).toBe(false);
    expect(data.status).toBe("draft_only_not_importable");
  });
  it("não junta linhas idênticas e a repetição produz o mesmo rascunho", () => {
    const input = review([decision, { ...decision, data_row_index: 2 }]);
    const source = { ...sheet, rows: [sheet.rows[0]!, sheet.rows[0]!] };
    const one = valid(input, source);
    expect(one.rows).toHaveLength(2);
    expect(new Set(one.rows.map((r) => r.origin_key)).size).toBe(2);
    expect(valid(input, source)).toEqual(one);
  });
  it("recusa decisões de outro arquivo", () => {
    expect(
      validateHistoricalReview(sheet, hash, { ...review(), source_sha256: "b".repeat(64) }).ok,
    ).toBe(false);
  });
  it.each([
    { decisions: [decision, decision] },
    { decisions: [{ ...decision, data_row_index: 2 }] },
    { decisions: [{ ...decision, data_row_index: 0 }] },
  ])("recusa decisões repetidas ou posição inexistente", ({ decisions }) => {
    expect(validateHistoricalReview(sheet, hash, review(decisions)).ok).toBe(false);
  });
  it("não aceita organização enviada no corpo nem entidade inválida", () => {
    expect(
      validateHistoricalReview(sheet, hash, { ...review(), organization_id: customer.id }).ok,
    ).toBe(false);
    expect(
      validateHistoricalReview(
        sheet,
        hash,
        review([{ ...decision, customer: { ...customer, id: "nome" } }]),
      ).ok,
    ).toBe(false);
  });
  it("uma linha sem decisão continua pendente", () => {
    expect(valid(review([])).review_required_rows).toBe(1);
  });
  it("endereço preenchido não pode ser descartado", () => {
    expect(valid(review([{ ...decision, location: { kind: "none" } }])).rows[0]?.issues).toContain(
      "populated_address_requires_location",
    );
  });
  it("não cria local a partir de endereço ausente", () => {
    const source = { ...sheet, rows: [["Cliente fictício", "", "0", "01/01/2024", "Serviço"]] };
    expect(valid(review(), source).rows[0]?.issues).toContain(
      "missing_address_cannot_create_location",
    );
  });
  it("valor inválido e serial de data continuam para revisão mesmo aceitos", () => {
    const source = {
      ...sheet,
      rows: [["Cliente fictício", "Rua fictícia", "PAGO", "45000", "Serviço"]],
    };
    expect(valid(review(), source).rows[0]?.issues).toEqual([
      "value_requires_correction",
      "date_requires_correction",
    ]);
  });
  it("aceite de data/valor é explícito", () => {
    expect(
      valid(review([{ ...decision, accept_original_date: false, accept_original_value: false }]))
        .rows[0]?.issues,
    ).toEqual(["value_acceptance_required", "date_acceptance_required"]);
  });
  it("mantém falta nula e auxiliares sem convertê-los em serviço", () => {
    const source = {
      ...sheet,
      rows: [
        ["Cliente fictício", "Rua fictícia", "", "", ""],
        ["", "", "", "", ""],
      ],
    };
    const data = valid(review(), source);
    expect(data.rows[0]?.value_cents).toBeNull();
    expect(data.rows[0]?.service_date).toBeNull();
    expect(data.auxiliary_rows).toBe(1);
  });
  it("recusa aliases ambíguos e não altera a fonte", () => {
    const source = { headers: ["Nome", "Endereço", "Address"], rows: [["Teste", "A", "B"]] };
    const original = JSON.stringify(source);
    expect(validateHistoricalReview(source, hash, review()).ok).toBe(false);
    expect(JSON.stringify(source)).toBe(original);
  });
});
