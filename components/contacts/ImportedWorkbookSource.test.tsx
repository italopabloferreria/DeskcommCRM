import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImportedWorkbookSource } from "./ImportedWorkbookSource";

afterEach(cleanup);
const batch = "12345678-1234-5123-a123-123456789012";
const metadata = {
  workbook_origin: { sheet: "CADASTRO", row: 12 },
  address_original: "Rua de exemplo, 10",
  phone_original: "(61) 90000-0000",
  legacy_id: "42",
  phone_requires_review: true,
  import_batch_id: batch,
};

describe("ImportedWorkbookSource", () => {
  it("shows preserved source fields and accepts the deterministic v5 batch link", () => {
    render(<ImportedWorkbookSource metadata={metadata} isAnonymized={false} />);
    expect(screen.getByText(metadata.address_original)).toBeTruthy();
    expect(screen.getByText(metadata.phone_original)).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("CADASTRO · Linha 12")).toBeTruthy();
    expect(screen.getByText(/Telefone pendente de revisão/)).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe(`/app/imports/${batch}`);
  });
  it("hides all original information after anonymization", () => {
    const { container } = render(<ImportedWorkbookSource metadata={metadata} isAnonymized />);
    expect(container.innerHTML).toBe("");
  });
  it.each([null, {}, { workbook_origin: [] }, { workbook_origin: { sheet: "CADASTRO", row: -1 } }])("hides missing or malformed origins", (value) => {
    const { container } = render(<ImportedWorkbookSource metadata={value} isAnonymized={false} />);
    expect(container.innerHTML).toBe("");
  });
  it("never renders an arbitrary metadata link or marks reviewed phones as pending", () => {
    render(<ImportedWorkbookSource metadata={{ ...metadata, import_batch_id: "javascript:alert(1)", phone_requires_review: false }} isAnonymized={false} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText(/Telefone pendente de revisão/)).toBeNull();
  });
  it("renders spreadsheet markup only as text", () => {
    const { container } = render(<ImportedWorkbookSource metadata={{ ...metadata, address_original: "<img src=x onerror=alert(1)>" }} isAnonymized={false} />);
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });
});
