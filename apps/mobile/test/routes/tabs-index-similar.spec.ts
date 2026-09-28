import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../app/(tabs)/index.tsx"), "utf-8");

describe("Home feed brand + model params", () => {
  it("reads brandId and modelId route params", () => {
    expect(source).toContain("useLocalSearchParams<{");
    expect(source).toContain("brandId?: string;");
    expect(source).toContain("modelId?: string;");
  });

  it("replaces active filters with exactly the brand + model", () => {
    expect(source).toContain("resetFilters();");
    expect(source).toContain('setField("brandId", brandId);');
    expect(source).toContain('setField("modelIds", [modelId]);');
    expect(source).toContain("applyFilters();");
  });

  it("clears the params once applied so the link can re-apply them", () => {
    expect(source).toContain("router.setParams({ brandId: undefined, modelId: undefined })");
  });
});
