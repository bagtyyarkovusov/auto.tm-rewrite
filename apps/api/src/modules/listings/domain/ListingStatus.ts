export type ListingStatus = "active" | "sold" | "archived" | "banned";

/**
 * Statuses whose Listings a User can see on public reads and in Favorites.
 * Deleted and banned Listings are never visible. This is the one definition:
 * `getVisibleCards`, the single-Listing summary and the Favorites list all use it.
 */
export const VISIBLE_LISTING_STATUSES = ["active", "sold", "archived"] as const;

/** Visible but no longer for sale: sold or archived. */
export const INACTIVE_VISIBLE_LISTING_STATUSES = VISIBLE_LISTING_STATUSES.filter(
  (status) => status !== "active",
);

const TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  active: ["sold", "archived"],
  sold: ["archived"],
  archived: ["active"],
  banned: [],
};

export function canTransition(
  from: ListingStatus,
  to: ListingStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
