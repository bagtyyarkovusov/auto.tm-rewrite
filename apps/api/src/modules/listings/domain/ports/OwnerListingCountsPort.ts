/**
 * What a User owns, counted without loading rows. `byStatus` keys every stored
 * Listing status the User has at least one non-deleted Listing in, including
 * statuses the owner-facing contract has no field for. `drafts` counts the
 * User's `ListingDraft` rows.
 */
export interface OwnerListingCounts {
  byStatus: Record<string, number>;
  drafts: number;
}

export interface OwnerListingCountsPort {
  countForOwner(ownerId: string): Promise<OwnerListingCounts>;
}

export const OWNER_LISTING_COUNTS_PORT = Symbol("OwnerListingCountsPort");
