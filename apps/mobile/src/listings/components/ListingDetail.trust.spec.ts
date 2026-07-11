import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./ListingDetail.tsx"), "utf-8");

describe("ListingDetailView trust positioning", () => {
  it("renders a trust info link", () => {
    expect(source).toContain("TrustInfoLink");
    expect(source).toContain('t("trustInfoTitle")');
    expect(source).toContain("/trust");
    expect(source).toContain("Linking.openURL");
  });

  it("uses a shield icon for the trust link", () => {
    expect(source).toContain("ShieldCheck");
  });

  it("places the trust link below seller/owner content", () => {
    const sellerBlockIndex = source.indexOf("<SellerBlock");
    const ownerActionsIndex = source.indexOf("<OwnerActions");
    const trustLinkIndex = source.indexOf("<TrustInfoLink");

    expect(trustLinkIndex).toBeGreaterThan(0);
    expect(trustLinkIndex).toBeGreaterThan(
      Math.max(sellerBlockIndex, ownerActionsIndex),
    );
  });
});
