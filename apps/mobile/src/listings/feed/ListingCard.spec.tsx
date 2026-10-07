import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./ListingCard.tsx"), "utf-8");

describe("ListingCard seller signal", () => {
  it("shows no per-Listing phone badge (ADR-0056)", () => {
    expect(source).not.toContain("sellerTrust");
    expect(source).not.toContain("verifiedPhone");
    expect(source).not.toContain("BadgeCheck");
  });

  it("keeps the sold badge compact so it does not shift price/title hierarchy", () => {
    expect(source).toContain("px-2 py-0.5");
    expect(source).toContain("text-caption");
  });
});
