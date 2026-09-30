import { describe, expect, it } from "vitest";
import type { CatalogSchemas } from "@auto-tm/contracts";

import {
  brandCountFilters,
  brandInitial,
  buildBrandSections,
  matchBrands,
} from "./brandPickerLogic";

const brands: CatalogSchemas.BrandSummary[] = [
  { id: "toyota", name: "Toyota", slug: "toyota", logoUrl: "https://cdn.test/toyota.png" },
  { id: "lexus", name: "Lexus", slug: "lexus" },
  { id: "bmw", name: "BMW", slug: "bmw", logoUrl: "https://cdn.test/bmw.png" },
  { id: "audi", name: "Audi", slug: "audi" },
  { id: "lada", name: "Lada", slug: "lada" },
];

const counts = new Map([
  ["toyota", 40],
  ["lexus", 12],
  ["bmw", 12],
  ["lada", 0],
]);

describe("brandInitial", () => {
  it("is the first letter, upper-cased, for the letter fallback", () => {
    expect(brandInitial("toyota")).toBe("T");
    expect(brandInitial("Лада")).toBe("Л");
    expect(brandInitial("  ëlan")).toBe("Ë");
  });

  it("falls back to the first digit or a placeholder", () => {
    expect(brandInitial("4Runner")).toBe("4");
    expect(brandInitial("—")).toBe("?");
    expect(brandInitial("")).toBe("?");
  });
});

describe("buildBrandSections", () => {
  it("lists Popular brands by count, then name, skipping brands with no listings", () => {
    const { popular } = buildBrandSections(brands, counts);

    expect(popular.map((b) => b.id)).toEqual(["toyota", "bmw", "lexus"]);
    expect(popular[0]).toEqual({
      id: "toyota",
      name: "Toyota",
      logoUrl: "https://cdn.test/toyota.png",
      count: 40,
    });
  });

  it("keeps a row without a logo so the picker shows its letter", () => {
    const { popular } = buildBrandSections(brands, counts);
    expect(popular.find((b) => b.id === "lexus")?.logoUrl).toBeUndefined();
  });

  it("caps Popular", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      id: `b${i}`,
      name: `Brand ${i}`,
      slug: `b${i}`,
    }));
    const manyCounts = new Map(many.map((b, i) => [b.id, i + 1]));

    expect(buildBrandSections(many, manyCounts).popular).toHaveLength(10);
  });

  it("lists every brand A to Z under its letter, with counts", () => {
    const { alphabet } = buildBrandSections(brands, counts);

    expect(alphabet.map((s) => s.letter)).toEqual(["A", "B", "L", "T"]);
    expect(alphabet.find((s) => s.letter === "L")?.rows.map((r) => [r.id, r.count])).toEqual([
      ["lada", 0],
      ["lexus", 12],
    ]);
  });

  it("still lists A to Z when counts have not loaded", () => {
    const { popular, alphabet } = buildBrandSections(brands, undefined);

    expect(popular).toEqual([]);
    expect(alphabet.flatMap((s) => s.rows)).toHaveLength(5);
  });
});

describe("matchBrands", () => {
  const search = (
    results: CatalogSchemas.CatalogSearchResultItem[],
  ): CatalogSchemas.CatalogSearchResponse => ({ results });

  it("returns null with no query, so the picker shows Recent, Popular and A to Z", () => {
    expect(matchBrands("", brands, counts, undefined)).toBeNull();
    expect(matchBrands("   ", brands, counts, undefined)).toBeNull();
  });

  it("shows only the brand results of the catalog search", () => {
    // What the API returns for "тойота" or "toyta": the brand plus its models.
    const response = search([
      { kind: "brand", brandId: "toyota", label: "Toyota" },
      { kind: "model", brandId: "toyota", modelId: "camry", label: "Camry", brandLabel: "Toyota" },
      { kind: "brand", brandId: "toyota", label: "Toyota" },
    ]);

    expect(matchBrands("тойота", brands, counts, response)).toEqual([
      { id: "toyota", name: "Toyota", logoUrl: "https://cdn.test/toyota.png", count: 40 },
    ]);
    expect(matchBrands("toyta", brands, counts, response)?.map((b) => b.id)).toEqual([
      "toyota",
    ]);
  });

  it("uses the search label for a brand missing from the list", () => {
    const response = search([{ kind: "brand", brandId: "kia", label: "Kia" }]);

    expect(matchBrands("kia", brands, counts, response)).toEqual([
      { id: "kia", name: "Kia", count: 0 },
    ]);
  });

  it("is empty while a search has no response yet", () => {
    expect(matchBrands("toy", brands, counts, undefined)).toEqual([]);
  });

  it("matches one letter locally, because the API ignores one-character queries", () => {
    expect(matchBrands("l", brands, counts, undefined)?.map((b) => b.id)).toEqual([
      "lada",
      "lexus",
    ]);
  });
});

describe("brandCountFilters", () => {
  it("keeps the other filters and drops brand and models, which the endpoint rejects", () => {
    expect(
      brandCountFilters({
        brandId: "toyota",
        modelId: "m0",
        modelIds: ["m1"],
        cityId: "c1",
        yearMin: 2015,
        condition: "used",
      }),
    ).toEqual({ cityId: "c1", yearMin: 2015, condition: "used" });
  });
});
