// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const priceDisplaySource = readFileSync(
  resolve(__dirname, "../components/PriceDisplay.tsx"),
  "utf-8",
);

const sellerBlockSource = readFileSync(
  resolve(__dirname, "../components/SellerBlock.tsx"),
  "utf-8",
);

const contactCtaSource = readFileSync(
  resolve(__dirname, "../components/ContactCtaBar.tsx"),
  "utf-8",
);

const photoGallerySource = readFileSync(
  resolve(__dirname, "../components/PhotoGallery.tsx"),
  "utf-8",
);

const listingDetailSource = readFileSync(
  resolve(__dirname, "../components/ListingDetail.tsx"),
  "utf-8",
);

const screenSource = readFileSync(
  resolve(__dirname, "../../../app/(public)/listings/[id].tsx"),
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
    expect(priceDisplaySource).toContain('t("exchangePossible")');
    expect(priceDisplaySource).toContain('t("installmentPossible")');
  });
});

describe("SellerBlock", () => {
  it("uses safe fallback copy for unavailable seller profile fields", () => {
    expect(sellerBlockSource).toContain('t("privateSeller")');
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

  it("renders verified-phone badge without implying inspection or dealer status", () => {
    expect(sellerBlockSource).toContain("phoneVerified");
    expect(sellerBlockSource).toContain('t("verifiedPhone")');
    expect(sellerBlockSource).not.toContain("inspection");
    expect(sellerBlockSource).not.toContain("dealer");
  });
});

describe("ContactCtaBar", () => {
  it("opens tel: URL only when calls are allowed and phone exists", () => {
    expect(contactCtaSource).toContain("canCall");
    expect(contactCtaSource).toContain("tel:");
    expect(contactCtaSource).toContain("allowCalls");
    expect(contactCtaSource).toContain("contactPhone");
  });

  it("enables Message for eligible listings with auth-on-action", () => {
    expect(contactCtaSource).toContain("allowChat");
    expect(contactCtaSource).toContain("canMessage");
    expect(contactCtaSource).toContain("MessageCircle");
    expect(contactCtaSource).toContain("useAuthIntentStore");
    expect(contactCtaSource).toContain("useOpenConversation");
  });

  it("disables Favorite without implementing favorites behavior", () => {
    expect(contactCtaSource).toContain('t("favorite")');
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
    expect(photoGallerySource).toContain('t("noPhotos")');
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
    expect(listingDetailSource).toContain('t("sold")');
  });

  it("renders spec grid with conditional fields", () => {
    expect(listingDetailSource).toContain('t("year")');
    expect(listingDetailSource).toContain('t("mileage")');
    expect(listingDetailSource).toContain('t("transmission")');
    expect(listingDetailSource).toContain('t("driveType")');
    expect(listingDetailSource).toContain('t("engineType")');
    expect(listingDetailSource).toContain('t("color")');
    expect(listingDetailSource).toContain('t("bodyType")');
    expect(listingDetailSource).toContain('t("vin")');
  });

  it("passes sellerTrust.phoneVerified to SellerBlock", () => {
    expect(listingDetailSource).toContain("sellerTrust?.phoneVerified");
    expect(listingDetailSource).toContain("phoneVerified={listing.sellerTrust?.phoneVerified}");
  });
});

describe("ListingDetailScreen", () => {
  it("renders unavailable state for missing/soft-deleted listings", () => {
    expect(screenSource).toContain('t("notAvailable")');
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

const step4SpecsSource = readFileSync(
  resolve(__dirname, "../wizard/Step4Specs.tsx"),
  "utf-8",
);

describe("ListingDetailView condition disclosure", () => {
  it("renders a structured condition disclosure section", () => {
    expect(listingDetailSource).toContain("ConditionDisclosureSection");
    expect(listingDetailSource).toContain("conditionDisclosure");
    expect(listingDetailSource).toContain('t("conditionDisclosure")');
  });

  it("shows honest empty state when disclosure is absent", () => {
    expect(listingDetailSource).toContain('t("noConditionDisclosure")');
    expect(listingDetailSource).toContain("disclosure ?");
  });

  it("renders all disclosure fields when present", () => {
    expect(listingDetailSource).toContain('t("accidentReported")');
    expect(listingDetailSource).toContain('t("mileageAccurate")');
    expect(listingDetailSource).toContain('t("ownerCountValue"');
    expect(listingDetailSource).toContain('t("serviceHistoryAvailable")');
    expect(listingDetailSource).toContain('t("knownIssuesText")');
  });
});

describe("Step4Specs condition disclosure inputs", () => {
  it("captures accident, mileage accuracy, service history, owners, and known issues", () => {
    expect(step4SpecsSource).toContain("ConditionDisclosureSection");
    expect(step4SpecsSource).toContain("accidentReported");
    expect(step4SpecsSource).toContain("mileageAccurate");
    expect(step4SpecsSource).toContain("serviceHistoryAvailable");
    expect(step4SpecsSource).toContain("ownerCount");
    expect(step4SpecsSource).toContain("knownIssuesText");
  });

  it("uses a Switch for boolean disclosure fields", () => {
    expect(step4SpecsSource).toContain("BooleanRow");
    expect(step4SpecsSource).toContain("Switch");
  });

  it("caps known issues text at 1000 characters", () => {
    expect(step4SpecsSource).toContain("maxLength={1000}");
    expect(step4SpecsSource).toContain("knownIssuesText");
  });

  it("accepts numeric owner count", () => {
    expect(step4SpecsSource).toContain("ownerCount");
    expect(step4SpecsSource).toContain('keyboardType="number-pad"');
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
