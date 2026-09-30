import { describe, expect, it, vi } from "vitest";

import { renderMobile, fireEvent } from "../../../test/render";

import { BrandModelCard } from "./BrandModelCard";

describe("Brand/model card", () => {
  it("uses one compact summary and separate edit and clear actions", () => {
    const onEdit = vi.fn(); const onClear = vi.fn();
    const view = renderMobile(<BrandModelCard hasBrand brandName="Toyota" modelNames={["Camry", "Corolla", "RAV4"]} onEdit={onEdit} onClear={onClear} />);
    expect(view.getByText("Toyota Camry, +2")).toBeTruthy();
    expect(view.queryByText("Corolla")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Toyota Camry, +2, Change models" }));
    fireEvent.press(view.getByLabelText("Clear brand and models"));
    expect(onEdit).toHaveBeenCalledOnce(); expect(onClear).toHaveBeenCalledOnce();
  });
  it("represents all brands or every model of one brand without model chips", () => {
    const view = renderMobile(<BrandModelCard hasBrand={false} modelNames={[]} onEdit={vi.fn()} onClear={vi.fn()} />);
    expect(view.getByText("All brands and models")).toBeTruthy(); expect(view.queryByLabelText("Clear brand and models")).toBeNull();
    view.rerender(<BrandModelCard hasBrand brandName="Toyota" modelNames={[]} onEdit={vi.fn()} onClear={vi.fn()} />);
    expect(view.getByText("All models · choose models")).toBeTruthy();
  });
});
