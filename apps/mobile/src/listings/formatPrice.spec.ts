import { describe, expect, it } from "vitest";

import { formatPrice, formatPriceRange } from "./formatPrice";

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
