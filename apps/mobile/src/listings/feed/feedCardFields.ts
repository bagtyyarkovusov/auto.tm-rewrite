import type { ListingsSchemas } from "@auto-tm/contracts";

/**
 * What the public feed adds to a summary for the Results card (issue 695).
 * Every field is optional on the wire: an older API sends none, and the card
 * then shows the two list photos and neither Call, Message nor the seller.
 */
export type FeedCardFields = Pick<ListingsSchemas.FeedListingSummary, "galleryKeys" | "allowCalls" | "allowChat" | "seller">;

/** Reads the feed-only fields of a feed item; the card reads them here and nowhere else. */
export function feedCardFields(listing: ListingsSchemas.FeedListingSummary): FeedCardFields {
  const { galleryKeys, allowCalls, allowChat, seller } = listing;
  return { galleryKeys, allowCalls, allowChat, seller };
}

/** The photos the Results strip shows: the gallery when the API sent one, else the two list photos, else the cover. */
export function feedCardPhotoKeys(listing: ListingsSchemas.FeedListingSummary): string[] {
  const gallery = listing.galleryKeys;
  if (gallery?.length) return gallery;
  if (listing.photoKeys.length) return listing.photoKeys;
  return listing.coverMediaKey ? [listing.coverMediaKey] : [];
}
