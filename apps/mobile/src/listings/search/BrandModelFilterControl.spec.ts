import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./BrandModelFilterControl.tsx"),
  "utf-8",
);

describe("BrandModelFilterControl structure", () => {
  it("imports catalog and listing hooks", () => {
    expect(source).toContain('import { useBrands }');
    expect(source).toContain('import { useModels }');
    expect(source).toContain('import { useListingModelCounts }');
  });

  it("imports reusable UI picker components", () => {
    expect(source).toContain('import { CatalogPickerSheet }');
    expect(source).toContain('import { PickerRow }');
  });

  it("imports checkbox for multi-select", () => {
    expect(source).toContain('import { Checkbox }');
  });

  it("accepts draft and setField props", () => {
    expect(source).toContain("draft: ListingFilter");
    expect(source).toContain("setField: <K extends keyof ListingFilter>");
  });
});

describe("BrandModelFilterControl brand behavior", () => {
  it("calls useBrands with resolved locale", () => {
    expect(source).toContain("useBrands(locale)");
  });

  it("writes brandId to draft on selection", () => {
    expect(source).toContain('setField("brandId", brandId)');
  });

  it("shows selected brand name on the row", () => {
    expect(source).toContain("selectedBrand?.name");
    expect(source).toContain('value={selectedBrand?.name}');
  });
});

describe("BrandModelFilterControl model behavior", () => {
  it("calls useModels with brandId and locale from draft", () => {
    expect(source).toContain('useModels(draft.brandId ?? "", locale)');
  });

  it("fetches model counts from listing-owned endpoint", () => {
    expect(source).toContain("useListingModelCounts");
    expect(source).toContain("buildModelCountFilters(draft)");
  });

  it("disables model row until brand is selected", () => {
    expect(source).toContain('disabled={!draft.brandId}');
  });

  it("writes modelIds array to draft on confirm", () => {
    expect(source).toContain('setField("modelIds",');
  });

  it("shows selected model name or count on the row", () => {
    expect(source).toContain("selectedModelNames");
    expect(source).toContain("modelsSelected");
  });
});

describe("BrandModelFilterControl cascade rule", () => {
  it("clears modelId and modelIds when a brand is selected", () => {
    expect(source).toContain('setField("modelId", undefined)');
    expect(source).toContain('setField("modelIds", undefined)');
    expect(source).toContain("handleSelectBrand");
  });
});

describe("BrandModelFilterControl multi-select sheet", () => {
  it("renders ModelMultiSelectSheet", () => {
    expect(source).toContain("ModelMultiSelectSheet");
  });

  it("renders checkboxes for model rows", () => {
    expect(source).toContain("<Checkbox");
  });

  it("sections models into popular and all groups", () => {
    expect(source).toContain('t("popularModels")');
    expect(source).toContain('t("allModels")');
  });

  it("shows selected count and confirm button", () => {
    expect(source).toContain('t("modelsSelected"');
    expect(source).toContain('t("selectNModels"');
  });

  it("supports clearing selected models", () => {
    expect(source).toContain("handleClear");
  });
});

describe("BrandModelFilterControl search", () => {
  it("filters brands by search text", () => {
    expect(source).toContain("brandSearch");
    expect(source).toContain("setBrandSearch");
    expect(source).toContain("filteredBrands");
  });

  it("filters models by search text in multi-select sheet", () => {
    expect(source).toContain("setSearch");
    expect(source).toContain("filteredModels");
  });

  it("resets brand search when brand picker closes", () => {
    expect(source).toContain('if (!open) setBrandSearch("")');
  });
});
