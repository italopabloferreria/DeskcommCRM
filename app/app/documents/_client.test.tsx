import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentsClient } from "./_client";

afterEach(() => vi.unstubAllGlobals());
describe("documentos com imagens manuais", () => {
  it("mantém assinatura e carimbo separados e permite retirar apenas um", async () => {
    render(<DocumentsClient podeUsarPng />);
    const arquivo = new File([new Uint8Array([137, 80, 78, 71])], "teste.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByLabelText("PNG de assinatura"), { target: { files: [arquivo] } });
    fireEvent.change(screen.getByLabelText("PNG de carimbo"), { target: { files: [arquivo] } });
    await waitFor(() => expect(screen.getByAltText("Prévia de assinatura")).toBeTruthy());
    await waitFor(() => expect(screen.getByAltText("Prévia de carimbo")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Retirar assinatura" }));
    expect(screen.queryByAltText("Prévia de assinatura")).toBeNull();
    expect(screen.getByAltText("Prévia de carimbo")).toBeTruthy();
  });
  it("não mantém imagem anterior ao escolher arquivo inválido", async () => {
    render(<DocumentsClient podeUsarPng />);
    const input = screen.getByLabelText("PNG de carimbo");
    fireEvent.change(input, {
      target: { files: [new File(["a"], "a.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(screen.getByAltText("Prévia de carimbo")).toBeTruthy());
    fireEvent.change(input, {
      target: { files: [new File(["a"], "a.jpg", { type: "image/jpeg" })] },
    });
    expect(screen.queryByAltText("Prévia de carimbo")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Use PNG");
  });
  it("não oferece imagens para papel sem permissão e não gera PDF inválido", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentsClient podeUsarPng={false} />);
    expect(screen.queryByLabelText("PNG de carimbo")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Baixar prévia em PDF" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
