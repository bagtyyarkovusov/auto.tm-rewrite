import { describe, expect, it } from "vitest";
import type { CatalogSchemas } from "@auto-tm/contracts";

import {
  buildModelRows,
  modelCountFilters,
  selectionFilters,
  toBrandModelChoice,
  toggleModelId,
} from "./modelPickerLogic";

const models: CatalogSchemas.ModelSummary[] = [
  { id: "corolla", name: "Corolla", slug: "corolla", brandId: "toyota" },
  { id: "camry", name: "Camry", slug: "camry", brandId: "toyota" },
  { id: "rav4", name: "RAV4", slug: "rav4", brandId: "toyota" },
  { id: "supra", name: "Supra", slug: "supra", brandId: "toyota" },
];

const counts = [
  { modelId: "camry", totalMatching: 9 },
  { modelId: "corolla", totalMatching: 9 },
  { modelId: "rav4", totalMatching: 3 },
];

describe("toggleModelId", () => {
  it("allows several models", () => {
    expect(toggleModelId(toggleModelId([], "camry"), "rav4")).toEqual(["camry", "rav4"]);
  });

  it("unticks a ticked model, back to none", () => {
    expect(toggleModelId(["camry"], "camry")).toEqual([]);
  });
});

describe("buildModelRows", () => {
  it("lists popular models by count, then the rest A to Z", () => {
    const { popular, others } = buildModelRows(models, counts, "");

    expect(popular.map((m) => [m.id, m.count])).toEqual([
      ["camry", 9],
      ["corolla", 9],
      ["rav4", 3],
    ]);
    expect(others.map((m) => [m.id, m.count])).toEqual([["supra", 0]]);
  });

  it("filters by the search field, ignoring case", () => {
    const { popular, others } = buildModelRows(models, counts, "  co");
    expect([...popular, ...others].map((m) => m.id)).toEqual(["corolla"]);
  });

  it("lists every model A to Z when counts have not loaded", () => {
    const { popular, others } = buildModelRows(models, undefined, "");
    expect(popular).toEqual([]);
    expect(others.map((m) => m.id)).toEqual(["camry", "corolla", "rav4", "supra"]);
  });
});

describe("selectionFilters", () => {
  const base = { cityId: "ashgabat", modelId: "stale", modelIds: ["stale"], brandId: "other" };

  it("counts the ticked models of the brand, keeping other filters", () => {
    expect(selectionFilters(base, "toyota", ["camry", "rav4"])).toEqual({
      cityId: "ashgabat",
      brandId: "toyota",
      modelIds: ["camry", "rav4"],
    });
  });

  it("treats no ticked model as every model of the brand", () => {
    expect(selectionFilters(base, "toyota", [])).toEqual({
      cityId: "ashgabat",
      brandId: "toyota",
    });
  });
});

describe("modelCountFilters", () => {
  it("asks for per-model counts of the brand without any model filter", () => {
    expect(
      modelCountFilters({ cityId: "ashgabat", modelIds: ["camry"], modelId: "x" }, "toyota"),
    ).toEqual({ cityId: "ashgabat", brandId: "toyota" });
  });

  it("drops the Results sort order, which the counts endpoint rejects with a 400", () => {
    expect(modelCountFilters({ cityId: "ashgabat", sort: "year_asc" }, "toyota")).toEqual({ cityId: "ashgabat", brandId: "toyota" });
  });
});

describe("toBrandModelChoice", () => {
  it("names the brand and the ticked models in tick order", () => {
    expect(
      toBrandModelChoice({ id: "toyota", name: "Toyota" }, models, ["rav4", "camry"]),
    ).toEqual({
      brandId: "toyota",
      brandName: "Toyota",
      modelIds: ["rav4", "camry"],
      modelNames: ["RAV4", "Camry"],
    });
  });

  it("is a brand-only choice when no model is ticked", () => {
    expect(toBrandModelChoice({ id: "toyota", name: "Toyota" }, models, [])).toEqual({
      brandId: "toyota",
      brandName: "Toyota",
      modelIds: [],
      modelNames: [],
    });
  });
});
