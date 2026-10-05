import { describe, expect, it, vi } from "vitest";
import { listContactsHandler } from "@/app/api/v1/contacts/_handler";

describe("paginação atravessa contatos sem atividade", () => {
  it.each(["asc", "desc"] as const)("inclui valores nulos após cursor %s", async (direction) => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq", "is", "order", "limit", "or"])
      query[method] = vi.fn(() => query);
    query.then = vi.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve));
    const cursor = Buffer.from(JSON.stringify({
      sort: "2026-01-15T12:00:00.000Z",
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    })).toString("base64url");
    await listContactsHandler({ from: () => query } as never, {
      organization_id: "11111111-1111-4111-8111-111111111111",
      actor: { type: "user", id: "owner" }, requestId: "cursor-null",
    }, { cursor, order_by: "last_activity_at", order_dir: direction, limit: 25 });
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining("last_activity_at.is.null"));
  });
});
