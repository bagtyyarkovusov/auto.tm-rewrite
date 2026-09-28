import { Enums } from "@auto-tm/contracts";
import { describe, expect, it } from "vitest";

import {
  closedListingBannerKey,
  isClosedForContact,
  similarListingsHref,
} from "./closedListing";

const ALL_STATUSES = Object.values(Enums.ListingStatus);

describe("isClosedForContact", () => {
  it("closes sold and archived Listings for contact", () => {
    expect(isClosedForContact(Enums.ListingStatus.Sold)).toBe(true);
    expect(isClosedForContact(Enums.ListingStatus.Archived)).toBe(true);
  });

  it("keeps every other status open", () => {
    const open = ALL_STATUSES.filter(
      (s) => s !== Enums.ListingStatus.Sold && s !== Enums.ListingStatus.Archived,
    );
    for (const status of open) {
      expect(isClosedForContact(status)).toBe(false);
    }
  });
});

describe("closedListingBannerKey", () => {
  it("labels sold Listings Sold", () => {
    expect(closedListingBannerKey(Enums.ListingStatus.Sold)).toBe("sold");
  });

  it("labels archived Listings Removed from sale", () => {
    expect(closedListingBannerKey(Enums.ListingStatus.Archived)).toBe(
      "removedFromSale",
    );
  });

  it("has a banner exactly when the Listing is closed for contact", () => {
    for (const status of ALL_STATUSES) {
      expect(closedListingBannerKey(status) !== null).toBe(
        isClosedForContact(status),
      );
    }
  });
});

describe("similarListingsHref", () => {
  it("opens the Home feed filtered by the Listing's brand and model", () => {
    expect(similarListingsHref({ brandId: "brand-1", modelId: "model-1" })).toEqual({
      pathname: "/(tabs)",
      params: { brandId: "brand-1", modelId: "model-1" },
    });
  });
});
