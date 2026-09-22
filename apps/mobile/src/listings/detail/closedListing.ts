import { Enums } from "@auto-tm/contracts";

/** i18n key for the status banner a buyer sees on a closed Listing. */
export type ClosedListingBannerKey = "sold" | "removedFromSale";

/**
 * Sold and archived (removed-from-sale) Listings stay readable for buyers but
 * are closed for contact: no Call, Message, ♡ or Report.
 */
export function isClosedForContact(status: Enums.ListingStatus): boolean {
  return (
    status === Enums.ListingStatus.Sold ||
    status === Enums.ListingStatus.Archived
  );
}

export function closedListingBannerKey(
  status: Enums.ListingStatus,
): ClosedListingBannerKey | null {
  if (status === Enums.ListingStatus.Sold) return "sold";
  if (status === Enums.ListingStatus.Archived) return "removedFromSale";
  return null;
}

/**
 * Home feed route for "See other Brand Model". Results does not exist yet, so
 * this opens the feed with the brand + model filter applied.
 */
export function similarListingsHref(listing: {
  brandId: string;
  modelId: string;
}) {
  return {
    pathname: "/(tabs)",
    params: { brandId: listing.brandId, modelId: listing.modelId },
  } as const;
}
