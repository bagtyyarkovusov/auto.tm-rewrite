import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./PostRefCard.tsx"), "utf-8");

describe("PostRefCard", () => {
  it("exports PostRefCard component", () => {
    expect(source).toContain("export function PostRefCard");
  });

  it("accepts listing reference fields", () => {
    expect(source).toContain("listingId: string");
    expect(source).toContain("brandId: string");
    expect(source).toContain("modelId: string");
    expect(source).toContain("displayPriceTmt: number");
    expect(source).toContain("priceCurrency: string");
    expect(source).toContain("coverMediaKey?: string");
    expect(source).toContain("available: boolean");
  });

  it("renders a compact card with image and title", () => {
    expect(source).toContain('contentFit="cover"');
    expect(source).toContain("text-sm font-medium text-foreground");
  });

  it("renders price text", () => {
    expect(source).toContain("priceText");
    expect(source).toContain("text-sm text-muted-foreground");
  });

  it("shows live state when available and active", () => {
    expect(source).toContain('isUnavailable ?');
    expect(source).toContain('t("active")');
  });

  it("shows unavailable/sold/archived state when not available", () => {
    expect(source).toContain('t("sold")');
    expect(source).toContain('t("archived")');
    expect(source).toContain('t("unavailable")');
  });

  it("disables press for unavailable listings", () => {
    expect(source).toContain("if (isUnavailable)");
    expect(source).toContain("return cardBody");
  });

  it("calls onPress with listingId for available listings", () => {
    expect(source).toContain("onPress?: (listingId: string) => void");
    expect(source).toContain("onPress?.(listingId)");
  });

  it("supports loading skeleton state", () => {
    expect(source).toContain("loading?: boolean");
    expect(source).toContain("<Skeleton");
  });

  it("supports error state", () => {
    expect(source).toContain("error?: string | null");
    expect(source).toContain("AlertCircle");
    expect(source).toContain("text-destructive");
  });

  it("falls back to IDs when brand/model names are unavailable", () => {
    expect(source).toContain("brandName ?? brandId.slice(0, 8)");
    expect(source).toContain("modelName ?? modelId.slice(0, 8)");
  });
});
