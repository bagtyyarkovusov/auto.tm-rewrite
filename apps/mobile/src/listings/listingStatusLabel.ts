import { Enums } from "@auto-tm/contracts";

/**
 * Maps a listing status to a localized label.
 *
 * Only active/sold/archived have display copy, so every other status resolves
 * to the generic "unavailable" label. Returning the raw enum instead would leak
 * internal vocabulary ("pending_review", "banned") into the UI untranslated,
 * which is what the conversation surfaces used to do.
 */
export function listingStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  switch (status) {
    case Enums.ListingStatus.Active:
      return t("active");
    case Enums.ListingStatus.Sold:
      return t("sold");
    case Enums.ListingStatus.Archived:
      return t("archived");
    default:
      return t("unavailable");
  }
}
