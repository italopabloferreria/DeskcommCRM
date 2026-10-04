import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DocumentsClient } from "./_client";
afterEach(() => vi.unstubAllGlobals());
it("preenche contato importado e empresa sem inferir documento e mantém edição", async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith("/api/v1/documents/archive"))
      return { ok: true, json: async () => ({ data: { documentos: [], proximoOffset: null } }) };
    if (!url.startsWith("/api/v1/contacts?") && !url.startsWith("/api/v1/companies?"))
      throw new Error(`Consulta inesperada: ${url}`);
    return {
      ok: true,
      json: async () => ({
        data: url.includes("/contacts?")
          ? [
              {
                id: "1",
                name: "Cliente teste",
                phone_number: null,
                source_metadata: { address_original: "Local original", phone_original: "ambíguo" },
              },
            ]
          : [
              {
                id: "1",
                legal_name: "Empresa teste",
                cnpj: "documento empresa",
                phone: "telefone empresa",
              },
            ],
      }),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<DocumentsClient podeUsarPng />);
  fireEvent.change(screen.getByLabelText("Buscar cliente cadastrado"), {
    target: { value: "teste" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Buscar cliente" }));
  fireEvent.click(await screen.findByRole("button", { name: "Empresa teste · Empresa" }));
  expect((screen.getByLabelText("CPF/CNPJ") as HTMLInputElement).value).toBe("documento empresa");
  fireEvent.click(screen.getByRole("button", { name: "Cliente teste · Contato" }));
  expect((screen.getByLabelText("Nome do cliente") as HTMLInputElement).value).toBe(
    "Cliente teste",
  );
  expect((screen.getByLabelText("Endereço") as HTMLInputElement).value).toBe("Local original");
  expect((screen.getByLabelText("CPF/CNPJ") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("Telefone") as HTMLInputElement).value).toBe("");
  fireEvent.change(screen.getByLabelText("Endereço"), { target: { value: "Local revisado" } });
  expect((screen.getByLabelText("Endereço") as HTMLInputElement).value).toBe("Local revisado");
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/contacts?search=teste&limit=20",
    expect.objectContaining({ credentials: "same-origin" }),
  );
});
it("limpa resultados anteriores quando nova consulta falha", async () => {
  let failed = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/v1/documents/archive"))
        return { ok: true, json: async () => ({ data: { documentos: [], proximoOffset: null } }) };
      if (!url.startsWith("/api/v1/contacts?") && !url.startsWith("/api/v1/companies?"))
        throw new Error(`Consulta inesperada: ${url}`);
      return {
        ok: !failed,
        json: async () =>
          failed
            ? { error: { message: "Busca indisponível" } }
            : { data: [{ id: "1", name: "Teste", legal_name: "Empresa" }] },
      };
    }),
  );
  render(<DocumentsClient podeUsarPng />);
  fireEvent.change(screen.getByLabelText("Buscar cliente cadastrado"), {
    target: { value: "teste" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Buscar cliente" }));
  await screen.findByRole("button", { name: "Teste · Contato" });
  failed = true;
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Buscar cliente" }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Buscar cliente" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Busca indisponível");
  expect(screen.queryByRole("button", { name: "Teste · Contato" })).toBeNull();
});
