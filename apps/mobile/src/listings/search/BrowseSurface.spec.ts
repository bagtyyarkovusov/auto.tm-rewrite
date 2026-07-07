import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(__dirname, "../../../app/(tabs)/index.tsx"),
  "utf-8",
);

describe("cars browse surface", () => {
  it("renders a prominent dedicated Filter/Search entry above the feed body", () => {
    expect(source).toContain('t("carsBrowseTitle")');
    expect(source).toContain('t("filterSearchCta")');
    expect(source).toContain('t("filterSearchCtaHint")');
    expect(source).toContain("SlidersHorizontal");
    expect(source).toContain("setSheetOpen(true)");
  });

  it("surfaces the active-filter count on the prominent entry", () => {
    expect(source).toContain("filters.count > 0");
    expect(source).toContain('t("activeFiltersCount", { count: filters.count })');
    expect(source).toContain('<Badge variant="brand"');
  });

  it("does not introduce feed quick-filter chips or permanent home copy", () => {
    expect(source).not.toContain("quickFilter");
    expect(source).not.toContain('t("home")');
  });
});
