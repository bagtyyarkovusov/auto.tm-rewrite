import { describe, expect, it } from "vitest";

import { buildResultsParams, parseResultsParams } from "./resultsParams";

describe("Results route params", () => {
  it("round-trips a brand with several models", () => {
    const params = buildResultsParams({ brandId: "toyota", modelIds: ["camry", "rav4"] });
    expect(parseResultsParams(params)).toEqual({
      brandId: "toyota",
      modelIds: ["camry", "rav4"],
    });
  });

  it("round-trips a brand-only choice", () => {
    const params = buildResultsParams({ brandId: "toyota", modelIds: [] });
    expect(params).toEqual({ brandId: "toyota" });
    expect(parseResultsParams(params)).toEqual({
      brandId: "toyota",
      modelIds: [],
    });
  });

  it("still reads the single modelId that 'See other Brand Model' sends", () => {
    expect(parseResultsParams({ brandId: "toyota", modelId: "camry" })).toEqual({
      brandId: "toyota",
      modelIds: ["camry"],
    });
  });

  it("is null without a brand, so Results stays the full feed", () => {
    expect(parseResultsParams({})).toBeNull();
    expect(parseResultsParams({ modelIds: "camry" })).toBeNull();
  });

  it("ignores empty model entries and array-valued params", () => {
    expect(parseResultsParams({ brandId: ["toyota"], modelIds: "camry,,rav4," })).toEqual({
      brandId: "toyota",
      modelIds: ["camry", "rav4"],
    });
  });
});
