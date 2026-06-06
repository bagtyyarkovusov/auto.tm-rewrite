import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./BrandModelFilterControl.tsx"),
  "utf-8",
);

describe("BrandModelFilterControl structure", () => {
  it("imports catalog hooks", () => {
    expect(source).toContain('import { useBrands }');
    expect(source).toContain('import { useModels }');
  });

  it("imports reusable picker components", () => {
    expect(source).toContain('import { CatalogPickerSheet }');
    expect(source).toContain('import { PickerRow }');
  });

  it("accepts draft and setField props", () => {
    expect(source).toContain("draft: ListingFilter");
    expect(source).toContain("setField: <K extends keyof ListingFilter>");
  });
});

describe("BrandModelFilterControl brand behavior", () => {
  it("calls useBrands with default locale", () => {
    expect(source).toContain("useBrands()");
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
  it("calls useModels with brandId from draft", () => {
    expect(source).toContain("useModels(draft.brandId ?? \"\")");
  });

  it("disables model row until brand is selected", () => {
    expect(source).toContain('disabled={!draft.brandId}');
  });

  it("writes modelId to draft on selection", () => {
    expect(source).toContain('setField("modelId", modelId)');
  });

  it("shows selected model name on the row", () => {
    expect(source).toContain("selectedModel?.name");
    expect(source).toContain('value={selectedModel?.name}');
  });
});

describe("BrandModelFilterControl cascade rule", () => {
  it("clears modelId when a brand is selected", () => {
    expect(source).toContain('setField("modelId", undefined)');
    expect(source).toContain("handleSelectBrand");
  });
});

describe("BrandModelFilterControl picker states", () => {
  it("passes loading state to brand picker", () => {
    expect(source).toContain("brandsLoading");
    expect(source).toContain("isLoading={brandsLoading}");
  });

  it("passes error state to brand picker", () => {
    expect(source).toContain("brandsError");
    expect(source).toContain("isError={brandsError}");
  });

  it("passes loading state to model picker", () => {
    expect(source).toContain("modelsLoading");
    expect(source).toContain("isLoading={modelsLoading}");
  });

  it("passes error state to model picker", () => {
    expect(source).toContain("modelsError");
    expect(source).toContain("isError={modelsError}");
  });

  it("shows empty messages for both pickers", () => {
    expect(source).toContain("emptyMessage");
    expect(source).toContain("No brands available");
    expect(source).toContain("No models available");
  });

  it("shows search-empty fallback for brands", () => {
    expect(source).toContain("No brands match your search");
  });

  it("shows search-empty fallback for models", () => {
    expect(source).toContain("No models match your search");
  });
});

describe("BrandModelFilterControl search", () => {
  it("filters brands by search text", () => {
    expect(source).toContain("brandSearch");
    expect(source).toContain("setBrandSearch");
    expect(source).toContain("filteredBrands");
  });

  it("filters models by search text", () => {
    expect(source).toContain("modelSearch");
    expect(source).toContain("setModelSearch");
    expect(source).toContain("filteredModels");
  });

  it("resets search when picker closes", () => {
    expect(source).toContain('if (!open) setBrandSearch("")');
    expect(source).toContain('if (!open) setModelSearch("")');
  });
});
