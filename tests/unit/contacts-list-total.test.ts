import { describe, expect, it, vi } from "vitest";
import { listContactsHandler } from "@/app/api/v1/contacts/_handler";

const org = "11111111-1111-4111-8111-111111111111";
const context = {
  organization_id: org,
  actor: { type: "user" as const, id: "owner" },
  requestId: "total",
};

function database(count: number | null = 4065) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "is", "order", "limit", "or", "contains", "gt", "lt"]) {
    query[method] = vi.fn(() => query);
  }
  query.then = vi.fn((resolve) => Promise.resolve({ data: [], error: null, count }).then(resolve));
  return { client: { from: vi.fn(() => query) } as never, query };
}

describe("total de contatos separado da página carregada", () => {
  it("conta os resultados filtrados na primeira página sem uma segunda consulta", async () => {
    const { client, query } = database();
    const result = await listContactsHandler(client, context, {
      limit: 25,
      tag: ["Base Limpax"],
      source: "import_csv",
    });
    expect(result).toMatchObject({ contacts: [], total: 4065 });
    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: "exact" });
    expect(query.eq).toHaveBeenCalledWith("organization_id", org);
    expect(query.eq).toHaveBeenCalledWith("kind", "person");
    expect(query.eq).toHaveBeenCalledWith("source", "import_csv");
    expect(query.is).toHaveBeenCalledWith("is_merged_into", null);
    expect(query.contains).toHaveBeenCalledWith("tags", ["base limpax"]);
    expect(query.limit).toHaveBeenCalledWith(26);
  });

  it("não recalcula o total depois de aplicar o cursor", async () => {
    const { client, query } = database(null);
    const cursor = Buffer.from(
      JSON.stringify({ sort: null, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }),
    ).toString("base64url");
    const result = await listContactsHandler(client, context, { limit: 25, cursor });
    expect(result.total).toBeUndefined();
    expect(query.select).toHaveBeenCalledWith(expect.any(String), undefined);
  });

  it("não inventa um total quando o banco não devolve a contagem", async () => {
    const { client } = database(null);
    expect((await listContactsHandler(client, context, { limit: 25 })).total).toBeUndefined();
  });
});
