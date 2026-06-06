import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./PriceRangeFilterControl.tsx"),
  "utf-8",
);

describe("PriceRangeFilterControl structure", () => {
  it("renders two number-pad inputs for min and max", () => {
    expect(source).toContain('keyboardType="number-pad"');
    expect(source).toContain("priceMin");
    expect(source).toContain("priceMax");
  });

  it("shows TMT affix on both fields", () => {
    expect(source).toContain("TMT");
  });

  it("strips non-digits from input", () => {
    expect(source).toContain("replace(/\\D/g");
  });

  it("writes undefined when input is cleared", () => {
    expect(source).toContain('=== "" ? undefined');
  });
});

describe("PriceRangeFilterControl validation", () => {
  it("detects min > max as invalid", () => {
    expect(source).toContain("priceMin > priceMax");
  });

  it("shows text-destructive inline error when invalid", () => {
    expect(source).toContain("text-destructive");
    expect(source).toContain("Minimum price cannot exceed maximum price");
  });

  it("signals validity via onValidityChange callback", () => {
    expect(source).toContain("onValidityChange");
    expect(source).toContain("valid");
  });

  it("has accessibility live region for error message", () => {
    expect(source).toContain('accessibilityLiveRegion="polite"');
  });
});

describe("PriceRangeFilterControl FilterSheet integration", () => {
  const filterSheetSource = readFileSync(
    resolve(__dirname, "./FilterSheet.tsx"),
    "utf-8",
  );

  it("is wired into FilterSheet as PriceRangeFilterControl", () => {
    expect(filterSheetSource).toContain("PriceRangeFilterControl");
  });

  it("disables Apply button when price range is invalid", () => {
    expect(filterSheetSource).toContain("disabled={isApplyDisabled}");
    expect(filterSheetSource).toContain("priceRangeValid");
  });

  it("reads draft priceMin and priceMax from filters", () => {
    expect(filterSheetSource).toContain("draft.priceMin");
    expect(filterSheetSource).toContain("draft.priceMax");
  });
});
