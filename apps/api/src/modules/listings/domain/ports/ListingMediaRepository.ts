import type { ListingMedia } from "../ListingMedia";

export interface ListingMediaRepository {
  save(media: ListingMedia): Promise<ListingMedia>;
  findById(id: string): Promise<ListingMedia | null>;
  findByListingId(listingId: string): Promise<ListingMedia[]>;
  delete(id: string): Promise<void>;
  updateSortOrder(
    listingId: string,
    orders: { mediaId: string; sortOrder: number }[],
  ): Promise<void>;
}

export const LISTING_MEDIA_REPOSITORY = Symbol("ListingMediaRepository");
