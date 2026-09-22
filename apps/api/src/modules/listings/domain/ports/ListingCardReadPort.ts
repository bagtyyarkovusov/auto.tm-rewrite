import type { CardPhotos } from "../CardPhotos";
import type { FeedCursor } from "../types";
import type { ListingSummary } from "./ListingsReadPort";

/**
 * In-context card read model: a `ListingSummary` plus the fields the
 * Favorites and My Listings cards render without a detail fetch.
 * Consumed only inside `listings/`; the cross-context `ListingsReadPort`
 * surface is unchanged.
 */
export interface ListingCard extends ListingSummary, CardPhotos {
  mileageKm?: number;
  condition?: "new" | "used";
  transmissionId?: string;
  engineTypeId?: string;
  contactPhone?: string;
  allowCalls: boolean;
}

export interface ListingCardReadPort {
  /** Cards for the given ids, excluding deleted, banned, and non-public-status Listings. Order is not preserved. */
  getVisibleCards(ids: string[]): Promise<ListingCard[]>;
  /** The owner's non-deleted Listings (any status), newest `updatedAt` first. */
  getOwnerCards(
    ownerId: string,
    query?: { cursor?: FeedCursor; limit?: number },
  ): Promise<{ items: ListingCard[]; nextCursor?: FeedCursor }>;
}

export const LISTING_CARD_READ_PORT = Symbol("ListingCardReadPort");
