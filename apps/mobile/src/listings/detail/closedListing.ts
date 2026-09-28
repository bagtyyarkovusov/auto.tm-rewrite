import { Enums } from "@auto-tm/contracts";

/** i18n key for the status banner a buyer sees on a closed Listing. */
export type ClosedListingBannerKey = "sold" | "removedFromSale";

/**
 * Sold and archived (removed-from-sale) Listings stay readable for buyers but
 * are closed for contact: the detail screen drops the contact bar and the
 * seller phone. Report is separately limited to active Listings.
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
 * Results route for "See other Brand Model", filtered by that brand + model.
 * Results is the interim filtered feed until #370 replaces it.
 */
export function similarListingsHref(listing: {
  brandId: string;
  modelId: string;
}) {
  return {
    pathname: "/(tabs)/(search)/results",
    params: { brandId: listing.brandId, modelId: listing.modelId },
  } as const;
}
