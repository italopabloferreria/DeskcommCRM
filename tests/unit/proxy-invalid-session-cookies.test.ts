import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake" } }));
vi.mock("@/lib/supabase/cookie-secure", () => ({ cookieSecure: () => false }));
vi.mock("@supabase/ssr", () => ({ createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[]) => void } }) => ({ auth: { getUser: async () => {
  options.cookies.setAll([{ name: "sb-deskcomm-auth.0", value: "", options: { maxAge: 0, path: "/", httpOnly: true, sameSite: "strict" } }]);
  return { data: { user: null }, error: { code: "user_banned" } };
} } }) }));

describe("sessão inválida conserva limpeza dos cookies na resposta", () => {
  it.each([["/app/contacts", 307], ["/api/private-cookies-test", 401]] as const)("limpa sessão em %s", async (pathname, status) => {
    const request = new NextRequest(`http://localhost:3000${pathname}`, { headers: { cookie: "sb-deskcomm-auth.0=invalid-fixture-session" } });
    const response = await proxy(request);
    expect(response.status).toBe(status);
    expect(response.cookies.get("sb-deskcomm-auth.0")?.maxAge).toBe(0);
    expect(response.cookies.get("sb-deskcomm-auth.0")?.value).toBe("");
  });
});