import { afterEach, beforeEach, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  support: vi.fn(),
  user: vi.fn(),
  org: vi.fn(),
  client: vi.fn(),
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: h.support }));
vi.mock("@/lib/auth/server", () => ({ loadAuthUser: h.user, resolveActiveOrg: h.org }));
vi.mock("@/lib/supabase/server", () => ({ createClient: h.client }));

import { GET } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const orgId = "22222222-2222-4222-8222-222222222222";
const originalFetch = globalThis.fetch;
const oldBase = process.env.WAHA_API_BASE_URL;
const oldKey = process.env.WAHA_API_KEY;
let rows: Array<Record<string, unknown>>;
let filters: Array<[string, unknown]>;

const call = () => GET(new Request(`http://localhost/api/v1/channel-sessions/${id}/qr`), {
  params: Promise.resolve({ id }),
});

beforeEach(() => {
  vi.clearAllMocks();
  rows = [{ id, organization_id: orgId, waha_session_name: "limpax-demo", archived_at: null }];
  filters = [];
  h.support.mockResolvedValue(null);
  h.user.mockResolvedValue({ id: "owner" });
  h.org.mockResolvedValue({ orgId });
  h.client.mockResolvedValue({
    from: (table: string) => {
      expect(table).toBe("channel_sessions");
      return {
        select: () => ({
          eq: function (column: string, value: unknown) {
            filters.push([column, value]);
            return this;
          },
          maybeSingle: async () => ({
            data: rows.find((row) => filters.every(([column, value]) => row[column] === value)) ?? null,
            error: null,
          }),
        }),
      };
    },
  });
  delete process.env.WAHA_API_BASE_URL;
  delete process.env.WAHA_API_KEY;
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (oldBase === undefined) delete process.env.WAHA_API_BASE_URL;
  else process.env.WAHA_API_BASE_URL = oldBase;
  if (oldKey === undefined) delete process.env.WAHA_API_KEY;
  else process.env.WAHA_API_KEY = oldKey;
});

it("recusa pessoa sem login sem consultar sessão ou WAHA", async () => {
  h.user.mockResolvedValue(null);
  expect((await call()).status).toBe(401);
  expect(h.client).not.toHaveBeenCalled();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it("consulta a sessão somente pela organização ativa e não mostra QR de outra organização", async () => {
  rows[0]!.organization_id = "another-org";
  expect((await call()).status).toBe(404);
  expect(filters).toContainEqual(["organization_id", orgId]);
  expect(filters).toContainEqual(["id", id]);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it("recusa canal arquivado ou sem sessão pareável antes de chamar WAHA", async () => {
  rows[0]!.archived_at = "2026-09-30T00:00:00Z";
  const archived = await call();
  expect(archived.status).toBe(409);
  expect(archived.headers.get("x-channel-state")).toBe("archived");
  rows[0]!.archived_at = null;
  rows[0]!.waha_session_name = null;
  filters = [];
  const official = await call();
  expect(official.status).toBe(409);
  expect(official.headers.get("x-channel-state")).toBe("no-session");
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it("informa indisponibilidade sem serviço configurado", async () => {
  expect((await call()).status).toBe(503);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it("entrega imagem sem cache apenas da sessão autorizada, mantendo a chave no servidor", async () => {
  process.env.WAHA_API_BASE_URL = "https://waha.example.invalid";
  process.env.WAHA_API_KEY = "test-only-key";
  vi.mocked(globalThis.fetch).mockResolvedValue(new Response(new Uint8Array([137, 80, 78, 71]), {
    status: 200,
    headers: { "content-type": "image/png" },
  }));
  const response = await call();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "https://waha.example.invalid/api/limpax-demo/auth/qr?format=image",
    expect.objectContaining({ headers: { "X-Api-Key": "test-only-key" }, cache: "no-store" }),
  );
  expect(response.headers.get("x-api-key")).toBeNull();
});
