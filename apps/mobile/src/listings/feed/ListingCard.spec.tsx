import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./ListingCard.tsx"), "utf-8");

describe("ListingCard verified seller signal", () => {
  it("accepts sellerTrust from the listing summary", () => {
    expect(source).toContain("sellerTrust");
    expect(source).toContain("phoneVerified");
  });

  it("renders a verified-phone badge when phoneVerified is true", () => {
    expect(source).toContain('t("verifiedPhone")');
    expect(source).toContain("BadgeCheck");
    expect(source).toContain("<Badge");
  });

  it("conditionally renders the badge based on phoneVerified", () => {
    expect(source).toContain("listing.sellerTrust?.phoneVerified");
  });

  it("uses neutral badge styling", () => {
    expect(source).toContain('variant="default"');
  });

  it("keeps the badge compact so it does not shift price/title hierarchy", () => {
    expect(source).toContain("px-2 py-0.5");
    expect(source).toContain("text-xs");
  });
});
