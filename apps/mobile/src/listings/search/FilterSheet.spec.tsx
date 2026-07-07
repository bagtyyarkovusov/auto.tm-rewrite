import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./FilterSheet.tsx"),
  "utf-8",
);

describe("FilterSheet funnel order", () => {
  it("renders core filters in Kolesa funnel order", () => {
    const order = [
      "ConditionFilterControl",
      "CityFilterControl",
      "BrandModelFilterControl",
      "YearRangeFilterControl",
      "PriceRangeFilterControl",
    ];

    const positions = order.map((name) => source.indexOf(`<${name}`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("keeps Apply disabled when sheet-level validation fails", () => {
    expect(source).toContain("const isApplyDisabled = !isValid || !priceRangeValid");
    expect(source).toContain("disabled={isApplyDisabled}");
    expect(source).toContain('t("checkFilterValues")');
  });

  it("does not claim a live listing result count on Apply", () => {
    expect(source).toContain('t("applyFiltersCount", { count })');
    expect(source).not.toContain('t("showResultsCount"');
  });
});
