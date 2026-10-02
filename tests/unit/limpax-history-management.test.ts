import { describe, expect, it } from "vitest";
import {
  historyCommandSchema,
  historySqlError,
  parseHistoryMoney,
} from "@/lib/crm-b2b/history-management";
const request_id = "4e000000-0000-4000-8000-000000000001";
const patch = {
  service_date: "2020-02-29",
  value_cents: 0,
  currency: null,
  notes_current: "",
  location_id: null,
};
describe("comandos controlados do histórico", () => {
  it("aceita correção explícita sem converter zero em nulo", () => {
    expect(
      historyCommandSchema.parse({
        action: "correct",
        request_id,
        expected_version: 0,
        reason: "source_review",
        patch,
      }),
    ).toMatchObject({ patch: { value_cents: 0 } });
  });
  it.each(["2023-02-29", "2020-04-31", "1899-12-31"])(
    "recusa data impossível/fora de faixa %s",
    (service_date) => {
      expect(
        historyCommandSchema.safeParse({
          action: "correct",
          request_id,
          expected_version: 0,
          reason: "source_review",
          patch: { ...patch, service_date },
        }).success,
      ).toBe(false);
    },
  );
  it.each(["organization_id", "actor_id", "person_id"])(
    "recusa autoridade/vínculo vindo do corpo %s",
    (field) => {
      expect(
        historyCommandSchema.safeParse({
          action: "void",
          request_id,
          expected_version: 0,
          reason: "duplicate",
          [field]: request_id,
        }).success,
      ).toBe(false);
    },
  );
  it("recusa valor fracionário, versão negativa e campos extras no patch", () => {
    expect(
      historyCommandSchema.safeParse({
        action: "correct",
        request_id,
        expected_version: 0,
        reason: "source_review",
        patch: { ...patch, value_cents: 0.5 },
      }).success,
    ).toBe(false);
    expect(
      historyCommandSchema.safeParse({
        action: "void",
        request_id,
        expected_version: -1,
        reason: "duplicate",
      }).success,
    ).toBe(false);
    expect(
      historyCommandSchema.safeParse({
        action: "correct",
        request_id,
        expected_version: 0,
        reason: "source_review",
        patch: { ...patch, company_id: request_id },
      }).success,
    ).toBe(false);
  });
  it("anonimização exige confirmação irreversível explícita", () => {
    expect(
      historyCommandSchema.safeParse({ action: "redact_person", request_id, confirm: false })
        .success,
    ).toBe(false);
    expect(
      historyCommandSchema.safeParse({ action: "redact_person", request_id, confirm: true })
        .success,
    ).toBe(true);
  });
  it("dinheiro digitado usa centavos inteiros sem arredondamento ambíguo", () => {
    expect(parseHistoryMoney("0,00")).toBe(0);
    expect(parseHistoryMoney("123,45")).toBe(12345);
    expect(parseHistoryMoney("")).toBeNull();
    expect(() => parseHistoryMoney("1.234,567")).toThrow();
  });
  it("erro SQL não expõe conteúdo do banco e distingue módulo/conflito", () => {
    expect(historySqlError({ code: "PGRST202", message: "secret" }).status).toBe(409);
    expect(historySqlError({ code: "PT409", message: "secret" }).code).toBe("history_conflict");
    expect(historySqlError({ code: "XX000", message: "secret" }).message).not.toContain("secret");
  });
});
