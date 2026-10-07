import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./FilteredEmpty.tsx"),
  "utf-8",
);

describe("FilteredEmpty", () => {
  it("exports FilteredEmpty component", () => {
    expect(source).toContain("export function FilteredEmpty");
  });

  it("accepts onReset prop", () => {
    expect(source).toContain("onReset: () => void");
  });

  it("renders 'No listings match' heading", () => {
    expect(source).toContain('t("noListingsMatch")');
  });

  it("renders 'Try adjusting filters' subtext", () => {
    expect(source).toContain('t("tryAdjustingFilters")');
  });

  it("has a Reset filters button", () => {
    expect(source).toContain('t("resetFilters")');
  });

  it("calls onReset when the button is pressed", () => {
    expect(source).toContain("onPress={onReset}");
  });

  it("uses the brand pill button for the primary action", () => {
    expect(source).toContain('variant="brand"');
    expect(source).toContain('size="pill"');
  });

  it("is built on the shared empty state with the search composition, like FeedEmpty", () => {
    expect(source).toContain("<EmptyState");
    expect(source).toContain('illustration="search"');
  });
});
