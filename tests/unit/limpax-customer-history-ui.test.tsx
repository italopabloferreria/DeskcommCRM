import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CustomerHistory } from "@/components/crm-b2b/customer-history";
const { translate } = vi.hoisted(() => ({ translate: (s: string) => s }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => translate }));
const id = "3e000000-0000-4000-8000-000000000001";
const base = {
  available: true,
  items: [
    {
      id,
      revision: 0,
      service_date: "2020-01-01",
      value_cents: 0,
      currency: null,
      notes_current: "Original",
      location_id: null,
      voided_at: null,
      redacted_at: null,
    },
  ],
  can_correct: true,
  can_void: false,
  can_redact: false,
  can_export: false,
  redacted: false,
  locations: [],
  locations_truncated: false,
};
beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ data: base }), { status: 200 }),
      ),
  );
});
describe("painel de histórico do cliente", () => {
  it("módulo ausente mostra indisponibilidade sem controles de escrita", async () => {
    vi.mocked(fetch).mockImplementation(
      async () => new Response(JSON.stringify({ data: { ...base, available: false, items: [] } })),
    );
    render(<CustomerHistory kind="person" id={id} />);
    expect(await screen.findByText(/ainda não está instalado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Corrigir" })).not.toBeInTheDocument();
  });
  it("viewer vê registro e zero sem botões de alteração", async () => {
    vi.mocked(fetch).mockImplementation(
      async () => new Response(JSON.stringify({ data: { ...base, can_correct: false } })),
    );
    render(<CustomerHistory kind="person" id={id} />);
    expect(await screen.findByText("0,00")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Corrigir" })).not.toBeInTheDocument();
  });
  it("envia correção com versão e recibo, sem autoridade de tenant no corpo", async () => {
    const call = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
      return new Response(
        JSON.stringify({ data: options?.method === "POST" ? { version: 1 } : base }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", call);
    render(<CustomerHistory kind="person" id={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Corrigir" }));
    fireEvent.change(screen.getByLabelText("Observações correntes"), {
      target: { value: "Corrigido" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    await waitFor(() => expect(call.mock.calls.some((c) => c[1]?.method === "POST")).toBe(true));
    const args = call.mock.calls.find((c) => c[1]?.method === "POST");
    const body = JSON.parse(args?.[1]?.body as string);
    expect(body.expected_version).toBe(0);
    expect(body.patch.value_cents).toBe(0);
    expect(body.patch.notes_current).toBe("Corrigido");
    expect(body).not.toHaveProperty("organization_id");
    expect(body.request_id).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("conflito mostra erro e não anuncia sucesso", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          async (_u: string, o?: RequestInit) =>
            new Response(
              JSON.stringify(
                o?.method === "POST" ? { error: { message: "O registro mudou." } } : { data: base },
              ),
              { status: o?.method === "POST" ? 409 : 200 },
            ),
        ),
    );
    render(<CustomerHistory kind="person" id={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Corrigir" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("O registro mudou.");
  });
  it("anonimização exige confirmação e é oferecida somente pela capacidade administrativa", async () => {
    vi.mocked(fetch).mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: { ...base, can_redact: true, can_export: true } })),
    );
    render(<CustomerHistory kind="person" id={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Anonimizar pessoa" }));
    expect(screen.getByRole("button", { name: "Anonimizar definitivamente" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Confirmo a limpeza irreversível/));
    expect(screen.getByRole("button", { name: "Anonimizar definitivamente" })).toBeEnabled();
  });
});

describe("paginação, exclusão e tentativas", () => {
  it("pagina por cursor e preserva a página anterior", async () => {
    const records = Array.from({ length: 26 }, (_, i) => ({
      ...base.items[0],
      id: "3e000000-0000-4000-8000-" + String(i + 1).padStart(12, "0"),
      notes_current: "Serviço " + (i + 1),
    }));
    const call = vi.fn().mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify({
            data: { ...base, items: url.includes("?after=") ? records.slice(25) : records },
          }),
        ),
    );
    vi.stubGlobal("fetch", call);
    render(<CustomerHistory kind="person" id={id} />);
    await screen.findByText("Serviço 25");
    expect(screen.queryByText("Serviço 26")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Serviço 26");
    expect(call).toHaveBeenLastCalledWith(
      expect.stringContaining("?after=" + records[24]!.id),
      expect.anything(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    await screen.findByText("Serviço 25");
  });
  it("exclusão lógica só envia comando depois da confirmação", async () => {
    const call = vi.fn().mockImplementation(
      async (_u: string, o?: RequestInit) =>
        new Response(
          JSON.stringify({
            data: o?.method === "POST" ? { version: 1 } : { ...base, can_void: true },
          }),
        ),
    );
    vi.stubGlobal("fetch", call);
    render(<CustomerHistory kind="person" id={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir da operação" }));
    expect(call.mock.calls.filter((c) => c[1]?.method === "POST")).toHaveLength(0);
    expect(screen.getByText(/origem permanecerá preservada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() =>
      expect(call.mock.calls.filter((c) => c[1]?.method === "POST")).toHaveLength(1),
    );
    const body = JSON.parse(
      call.mock.calls.find((c) => c[1]?.method === "POST")![1].body as string,
    );
    expect(body).toMatchObject({ action: "void", expected_version: 0, reason: "duplicate" });
  });
  it("falha de rede permite repetir o mesmo recibo sem duplicar a intenção", async () => {
    const call = vi.fn().mockImplementation(async (_u: string, o?: RequestInit) => {
      if (o?.method === "POST") throw new Error("Falha de rede");
      return new Response(JSON.stringify({ data: base }));
    });
    vi.stubGlobal("fetch", call);
    render(<CustomerHistory kind="person" id={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Corrigir" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    await waitFor(() =>
      expect(call.mock.calls.filter((c) => c[1]?.method === "POST")).toHaveLength(2),
    );
    const bodies = call.mock.calls
      .filter((c) => c[1]?.method === "POST")
      .map((c) => JSON.parse(c[1].body as string));
    expect(bodies[0].request_id).toBe(bodies[1].request_id);
  });
  it("exportação recusada não cria arquivo parcial", async () => {
    const create = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    vi.mocked(fetch).mockImplementation(
      async (u) =>
        new Response(
          JSON.stringify(
            String(u).includes("?export=")
              ? { error: { message: "Exportação excedeu limite." } }
              : { data: { ...base, can_export: true } },
          ),
          { status: String(u).includes("?export=") ? 413 : 200 },
        ),
    );
    render(<CustomerHistory kind="person" id={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Exportar pessoa e histórico" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Exportação excedeu limite.");
    expect(create).not.toHaveBeenCalled();
  });
});
