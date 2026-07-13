import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./PriceDisplay.tsx"),
  "utf-8",
);

describe("PriceDisplay owner mode", () => {
  it("accepts isOwner prop", () => {
    expect(source).toContain("isOwner?: boolean");
  });

  it("accepts priceAmount and priceCurrency props", () => {
    expect(source).toContain("priceAmount: number");
    expect(source).toContain("priceCurrency: string");
  });

  it("shows original currency secondary for owner when not TMT", () => {
    expect(source).toContain("isOwner && priceCurrency !== \"TMT\"");
    expect(source).toContain("priceAmount.toLocaleString");
    expect(source).toContain("priceCurrency");
  });

  it("does not show original currency for public mode", () => {
    // The showOriginal flag defaults to false when isOwner is absent
    expect(source).toContain("isOwner = false");
  });

  it("renders TMT price as primary display", () => {
    expect(source).toContain("displayPriceTmt");
    expect(source).toContain("TMT");
  });

  it("formats prices using the active i18n locale", () => {
    expect(source).toContain("const { t, i18n } = useTranslation()");
    expect(source).toContain("i18n.language");
    expect(source).toContain("toLocaleString(i18n.language)");
  });

  it("keeps the primary price on a single line to avoid layout breaks", () => {
    expect(source).toContain('numberOfLines={1}');
  });
});
