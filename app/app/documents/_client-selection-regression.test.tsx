import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DocumentsClient } from "./_client";

vi.mock("./_arquivos", () => ({ ArquivosDocumentos: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function searchFixture(companyStatus = 200) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: !url.includes("/companies?") || companyStatus === 200,
    status: url.includes("/companies?") ? companyStatus : 200,
    json: async () => url.includes("/contacts?")
      ? { data: [{ id: "22222222-2222-4222-8222-222222222222", name: "Cliente B" }] }
      : companyStatus === 200 ? { data: [] } : { error: { message: "Not found." } },
  })));
}

async function search() {
  fireEvent.change(screen.getByLabelText("Buscar cliente cadastrado"), { target: { value: "Cliente" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar cliente" }));
  return screen.findByRole("button", { name: "Cliente B · Contato" });
}

it("seleção de outro cliente substitui o destinatário anterior", async () => {
  searchFixture();
  render(<DocumentsClient podeUsarPng />);
  fireEvent.change(screen.getByLabelText("Cliente ou destinatário"), { target: { value: "Cliente A" } });
  fireEvent.click(await search());
  expect((screen.getByLabelText("Cliente ou destinatário") as HTMLInputElement).value).toBe("{{cliente.nome}}");
  expect((screen.getByLabelText("Nome do cliente") as HTMLInputElement).value).toBe("Cliente B");
});

it("contatos continuam disponíveis quando empresas não está instalado", async () => {
  searchFixture(404);
  render(<DocumentsClient podeUsarPng />);
  expect(await search()).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
