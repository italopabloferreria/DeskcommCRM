import { createClient } from "@supabase/supabase-js";
import { beforeEach, expect, it, vi } from "vitest";
import { marcaDaInstalacao, invalidarMarcaDaInstalacao } from "@/lib/branding/instalacao";
import {
  modoDeCadastro,
  esquecerModoDeCadastro,
  invalidarModoDeCadastro,
} from "@/lib/auth/politica-de-cadastro";

const transporte = vi.hoisted(() => ({
  lento: false,
  abortados: new Set<AbortSignal>(),
  clientes: 0,
}));
vi.mock("@/lib/env", () => ({ env: { SIGNUP_MODE: "so_convite" } }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () =>
    createClient("https://database.invalid", "test-key", {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: `prazo-${transporte.clientes++}`,
      },
      global: {
        fetch: async (_input, init) => {
          if (!transporte.lento)
            return new Response(JSON.stringify({ signup_mode: "com_aprovacao" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          return new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            const abortar = () => {
              // O SDK pode repetir transporte já abortado; o prazo é por consulta.
              if (signal) transporte.abortados.add(signal);
              reject(signal?.reason ?? new Error("Abortado"));
            };
            if (signal?.aborted) abortar();
            else signal?.addEventListener("abort", abortar, { once: true });
          });
        },
      },
    }),
}));

beforeEach(() => {
  esquecerModoDeCadastro();
  invalidarMarcaDaInstalacao();
  transporte.lento = false;
  transporte.abortados.clear();
});

it("cancela de verdade as duas leituras lentas e mantém o modo conhecido", async () => {
  await expect(modoDeCadastro()).resolves.toBe("com_aprovacao");
  invalidarModoDeCadastro();
  transporte.lento = true;
  const inicio = Date.now();
  const [marca, modo] = await Promise.all([marcaDaInstalacao(), modoDeCadastro()]);
  expect(marca).toBeNull();
  expect(modo).toBe("com_aprovacao");
  expect(transporte.abortados.size).toBe(2);
  expect(Date.now() - inicio).toBeLessThan(5_000);
});

it("preserva o piso somente-convite quando a primeira leitura expira", async () => {
  transporte.lento = true;
  await expect(modoDeCadastro()).resolves.toBe("so_convite");
  expect(transporte.abortados.size).toBe(1);
});
