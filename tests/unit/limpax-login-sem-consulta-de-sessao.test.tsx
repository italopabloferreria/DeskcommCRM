import { expect, it, vi } from "vitest";
const auth = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("rede indisponível");
  }),
);
vi.mock("@/lib/supabase/server", () => ({ createClient: auth }));
vi.mock("@/components/auth/EntrarComGoogle", () => ({ EntrarComGoogle: () => null }));
vi.mock("@/components/auth/LoginForm", () => ({ LoginForm: () => null }));
vi.mock("@/lib/branding", () => ({
  branding: () => ({ name: "LimpaxCRM" }),
  marcaEhADoProduto: () => false,
}));
vi.mock("@/lib/branding/saida", () => ({
  marcaDaSaida: async () => ({ nome: "LimpaxCRM", logoUrl: null }),
}));
vi.mock("@/lib/auth/politica-de-cadastro", () => ({ modoDeCadastro: async () => "so_convite" }));
vi.mock("@/lib/i18n/idiomaAnonimo", () => ({ idiomaDoVisitante: async () => "pt-BR" }));
import LoginPage from "@/app/(public)/login/page";
import PublicLayout from "@/app/(public)/layout";
it("entrega o formulário público mesmo quando a consulta de sessão não pode funcionar", async () => {
  const page = await LoginPage({ searchParams: Promise.resolve({}) });
  expect(page).toBeTruthy();
  expect(auth).not.toHaveBeenCalled();
});
it("entrega também a casca pública sem consulta de sessão", async () => {
  const layout = await PublicLayout({ children: null });
  expect(layout).toBeTruthy();
  expect(auth).not.toHaveBeenCalled();
});
