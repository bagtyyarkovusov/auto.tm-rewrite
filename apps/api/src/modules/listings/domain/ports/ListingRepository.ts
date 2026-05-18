import type { Listing } from "../Listing";

export interface ListingRepository {
  save(listing: Listing): Promise<Listing>;
  findById(id: string): Promise<Listing | null>;
  findBySellerId(
    sellerId: string,
    opts?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: Listing[]; nextCursor?: { timestamp: string; id: string } }>;
  update(listing: Listing): Promise<Listing>;
  softDelete(id: string, at: Date): Promise<void>;
}

export const LISTING_REPOSITORY = Symbol("ListingRepository");
