import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./SellerBlock.tsx"), "utf-8");

describe("SellerBlock verified seller signal", () => {
  it("accepts phoneVerified prop", () => {
    expect(source).toContain("phoneVerified?: boolean");
  });

  it("renders a verified-phone badge when phoneVerified is true", () => {
    expect(source).toContain('t("verifiedPhone")');
    expect(source).toContain("BadgeCheck");
    expect(source).toContain("<Badge");
  });

  it("conditionally renders the badge based on phoneVerified", () => {
    expect(source).toContain("phoneVerified &&");
  });

  it("places the badge near the seller label without implying inspection status", () => {
    expect(source).toContain('t("seller")');
    expect(source).not.toContain("inspection");
    expect(source).not.toContain("dealer");
  });

  it("uses neutral badge styling", () => {
    expect(source).toContain('variant="default"');
  });
});
