import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./SellerBlock.tsx"), "utf-8");

describe("SellerBlock seller signal", () => {
  it("shows no per-Listing phone badge (ADR-0056)", () => {
    expect(source).not.toContain("phoneVerified");
    expect(source).not.toContain("verifiedPhone");
    expect(source).not.toContain("<Badge");
  });

  it("labels the seller without implying inspection status", () => {
    expect(source).toContain('t("seller")');
    expect(source).not.toContain("inspection");
    expect(source).not.toContain("dealer");
  });
});
