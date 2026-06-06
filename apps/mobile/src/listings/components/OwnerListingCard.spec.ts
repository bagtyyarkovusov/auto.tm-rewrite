import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "OwnerListingCard.tsx"), "utf-8");

describe("OwnerListingCard structure", () => {
  it("renders a Pressable card with cover image and text content", () => {
    expect(source).toContain("<Pressable");
    expect(source).toContain("<Image");
    expect(source).toContain("formatPrice(listing.displayPriceTmt)");
  });

  it("displays status badges for active, sold, and archived", () => {
    expect(source).toContain('case Enums.ListingStatus.Active');
    expect(source).toContain('case Enums.ListingStatus.Sold');
    expect(source).toContain('case Enums.ListingStatus.Archived');
    expect(source).toContain("<Badge");
  });

  it("provides Open and Edit actions", () => {
    expect(source).toContain("onOpen(listing.id)");
    expect(source).toContain("onEdit(listing.id)");
    expect(source).toContain("Open");
    expect(source).toContain("Edit");
  });

  it("derives title from year, brand, and model", () => {
    expect(source).toContain("listing.year");
    expect(source).toContain("listing.brandId");
    expect(source).toContain("listing.modelId");
  });
});
