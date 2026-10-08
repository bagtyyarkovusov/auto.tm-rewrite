import { describe, expect, it } from "vitest";

import { formatAmountInput, formatPrice, formatPriceRange, parseAmountInput } from "./formatPrice";

describe("TMT price formatting", () => {
  it("labels a price in TMT with locale grouping", () => {
    expect(formatPrice(70000, "en")).toBe("70,000 TMT");
    expect(formatPrice(70000, "ru")).toBe(`${(70000).toLocaleString("ru-RU")} TMT`);
  });

  it("labels a price range once, after the upper bound, with locale grouping", () => {
    expect(formatPriceRange(70000, 120000, "en")).toBe("70,000 – 120,000 TMT");
    expect(formatPriceRange(70000, 120000, "tk")).toBe(`${(70000).toLocaleString("tk-TM")} – ${(120000).toLocaleString("tk-TM")} TMT`);
  });

  it("groups digits the same way as a single price, so the two cannot drift apart", () => {
    expect(formatPriceRange(1000, 2000, "ru")).toBe(`${formatPrice(1000, "ru").replace(" TMT", "")} – ${formatPrice(2000, "ru")}`);
  });
});

describe("price entry", () => {
  it("groups the typed digits exactly as a displayed price is grouped", () => {
    for (const locale of ["en", "ru", "tk"]) {
      expect(`${formatAmountInput(2329600, locale)} TMT`).toBe(formatPrice(2329600, locale));
    }
    expect(formatAmountInput(185000, "en")).toBe("185,000");
    expect(formatAmountInput(999, "en")).toBe("999");
    expect(formatAmountInput(undefined, "en")).toBe("");
  });

  it.each([
    ["185000", 185000],
    ["185,000", 185000],
    ["185 000", 185000],
    ["185\u00a0000", 185000],
    ["185\u202f000", 185000],
    ["1.850.000", 1850000],
    ["2 329 600 TMT", 2329600],
    ["  70'000 ", 70000],
    ["185,000.50", 185000],
    ["185 000,5", 185000],
    ["007", 7],
  ])("parses %j to the plain number %i", (text, amount) => {
    expect(parseAmountInput(text)).toBe(amount);
  });

  it.each(["", " ", "TMT", ","])("parses %j to no amount", (text) => {
    expect(parseAmountInput(text)).toBeUndefined();
  });

  it("round-trips its own grouping in every language", () => {
    for (const locale of ["en", "ru", "tk"]) {
      expect(parseAmountInput(formatAmountInput(2329600, locale))).toBe(2329600);
    }
  });
});
