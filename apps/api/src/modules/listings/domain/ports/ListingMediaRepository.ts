import type { ListingMedia } from "../ListingMedia";

export interface ListingMediaRepository {
  /**
   * Persists the row. When `media.uploadId` is set the adoption is atomic and
   * single-use: a second row for the same upload fails with a DomainError
   * carrying `UPLOAD_ALREADY_ATTACHED`.
   */
  save(media: ListingMedia): Promise<ListingMedia>;
  findById(id: string): Promise<ListingMedia | null>;
  findByListingId(listingId: string): Promise<ListingMedia[]>;
  delete(id: string): Promise<void>;
  /**
   * Atomically deletes the row and the upload it adopted. `removed` is false when
   * another caller already deleted it. `ownedKey` is the storage key the caller
   * may now delete, and is non-null only for the one caller that released an
   * adopted upload while no other row references any key or poster in its cleanup
   * directory. When supplied, minimumPhotos is checked under a Listing lock
   * before deletion, so concurrent removals cannot cross the floor. A row without
   * provenance never yields a key.
   */
  deleteReleasingUpload(id: string, minimumPhotos?: number): Promise<{ removed: boolean; ownedKey: string | null }>;
  updateSortOrder(
    listingId: string,
    orders: { mediaId: string; sortOrder: number }[],
  ): Promise<void>;
}

export const LISTING_MEDIA_REPOSITORY = Symbol("ListingMediaRepository");
