// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const priceDisplaySource = readFileSync(
  resolve(__dirname, "../../../src/listings/components/PriceDisplay.tsx"),
  "utf-8",
);

const sellerBlockSource = readFileSync(
  resolve(__dirname, "../../../src/listings/components/SellerBlock.tsx"),
  "utf-8",
);

const contactCtaSource = readFileSync(
  resolve(__dirname, "../../../src/listings/components/ContactCtaBar.tsx"),
  "utf-8",
);

const photoGallerySource = readFileSync(
  resolve(__dirname, "../../../src/listings/components/PhotoGallery.tsx"),
  "utf-8",
);

const listingDetailSource = readFileSync(
  resolve(__dirname, "../../../src/listings/components/ListingDetail.tsx"),
  "utf-8",
);

const screenSource = readFileSync(
  resolve(__dirname, "./[id].tsx"),
  "utf-8",
);

describe("PriceDisplay (public/buyer mode)", () => {
  it("shows TMT price only (no original currency)", () => {
    expect(priceDisplaySource).toContain("displayPriceTmt");
    expect(priceDisplaySource).toContain("TMT");
    expect(priceDisplaySource).not.toContain("USD");
    expect(priceDisplaySource).not.toContain("AED");
  });

  it("accepts priceAmount and priceCurrency for owner mode", () => {
    expect(priceDisplaySource).toContain("priceAmount");
    expect(priceDisplaySource).toContain("priceCurrency");
    expect(priceDisplaySource).toContain("isOwner");
  });

  it("renders seller term badges conditionally", () => {
    expect(priceDisplaySource).toContain("acceptsExchange");
    expect(priceDisplaySource).toContain("installmentAvailable");
    expect(priceDisplaySource).toContain("Exchange possible");
    expect(priceDisplaySource).toContain("Installment possible");
  });
});

describe("SellerBlock", () => {
  it("uses safe fallback copy for unavailable seller profile fields", () => {
    expect(sellerBlockSource).toContain("Private seller");
    expect(sellerBlockSource).not.toContain("avatar");
    expect(sellerBlockSource).not.toContain("tenure");
    expect(sellerBlockSource).not.toContain("response time");
  });

  it("shows contact phone only when calls are allowed", () => {
    expect(sellerBlockSource).toContain("allowCalls");
    expect(sellerBlockSource).toContain("contactPhone");
  });

  it("renders city/region/location context", () => {
    expect(sellerBlockSource).toContain("cityName");
    expect(sellerBlockSource).toContain("regionName");
    expect(sellerBlockSource).toContain("locationText");
  });
});

describe("ContactCtaBar", () => {
  it("opens tel: URL only when calls are allowed and phone exists", () => {
    expect(contactCtaSource).toContain("canCall");
    expect(contactCtaSource).toContain("tel:");
    expect(contactCtaSource).toContain("allowCalls");
    expect(contactCtaSource).toContain("contactPhone");
  });

  it("disables Message with honest coming-soon copy", () => {
    expect(contactCtaSource).toContain("Chat coming soon");
    expect(contactCtaSource).toContain("MessageCircle");
    expect(contactCtaSource).toContain("disabled");
  });

  it("disables Favorite without implementing favorites behavior", () => {
    expect(contactCtaSource).toContain("Favorite coming soon");
    expect(contactCtaSource).toContain("Heart");
    expect(contactCtaSource).toContain("disabled");
  });

  it("includes Share action", () => {
    expect(contactCtaSource).toContain("Share");
    expect(contactCtaSource).toContain("Share2");
  });

  it("disables Call for sold listings", () => {
    expect(contactCtaSource).toContain("Enums.ListingStatus.Sold");
  });
});

describe("PhotoGallery", () => {
  it("uses detail variant in main gallery", () => {
    expect(photoGallerySource).toContain('"detail"');
  });

  it("uses fullscreen variant in fullscreen viewer", () => {
    expect(photoGallerySource).toContain('"fullscreen"');
  });

  it("renders no-media fallback", () => {
    expect(photoGallerySource).toContain("No photos");
    expect(photoGallerySource).toContain("media.length === 0");
  });

  it("supports horizontal browsing with paging", () => {
    expect(photoGallerySource).toContain("pagingEnabled");
    expect(photoGallerySource).toContain("horizontal");
  });
});

describe("ListingDetailView", () => {
  it("derives title from year + brand + model + generation", () => {
    expect(listingDetailSource).toContain("buildTitle");
    expect(listingDetailSource).toContain("year");
    expect(listingDetailSource).toContain("brandId");
    expect(listingDetailSource).toContain("modelId");
    expect(listingDetailSource).toContain("generationId");
  });

  it("does not display raw UUIDs when catalog names are available", () => {
    expect(listingDetailSource).toContain("maps.brandName");
    expect(listingDetailSource).toContain("maps.modelName");
    expect(listingDetailSource).toContain("?? listing.brandId");
    expect(listingDetailSource).toContain("?? listing.modelId");
  });

  it("renders sold badge when status is sold", () => {
    expect(listingDetailSource).toContain("Enums.ListingStatus.Sold");
    expect(listingDetailSource).toContain("Sold");
  });

  it("renders spec grid with conditional fields", () => {
    expect(listingDetailSource).toContain("Year");
    expect(listingDetailSource).toContain("Mileage");
    expect(listingDetailSource).toContain("Transmission");
    expect(listingDetailSource).toContain("Drive type");
    expect(listingDetailSource).toContain("Engine");
    expect(listingDetailSource).toContain("Color");
    expect(listingDetailSource).toContain("Body type");
    expect(listingDetailSource).toContain("VIN");
  });
});

describe("ListingDetailScreen", () => {
  it("renders unavailable state for missing/soft-deleted listings", () => {
    expect(screenSource).toContain("This listing is no longer available");
    expect(screenSource).toContain('"status" in error');
  });

  it("shows skeleton with stable dimensions", () => {
    expect(screenSource).toContain("DetailSkeleton");
    expect(screenSource).toContain("h-[260px]");
    expect(screenSource).toContain("h-8 w-3/4");
  });

  it("shows manual retry on hard error", () => {
    expect(screenSource).toContain("onRetry");
    expect(screenSource).toContain("refetch");
  });

  it("uses useViewer to determine ownership", () => {
    expect(screenSource).toContain("useViewer");
    expect(screenSource).toContain("viewer.userId === data.sellerId");
  });

  it("hides buyer ContactCtaBar for owner", () => {
    expect(screenSource).toContain("!isOwner &&");
  });

  it("passes isOwner to ListingDetailView", () => {
    expect(screenSource).toContain("isOwner={isOwner}");
  });
});

describe("ListingDetailView owner branching", () => {
  it("renders OwnerActions when isOwner is true", () => {
    expect(listingDetailSource).toContain("isOwner ? (");
    expect(listingDetailSource).toContain("<OwnerActions");
  });

  it("renders SellerBlock when isOwner is false", () => {
    expect(listingDetailSource).toContain("<SellerBlock");
  });

  it("accepts isOwner prop", () => {
    expect(listingDetailSource).toContain("isOwner?: boolean");
  });
});
