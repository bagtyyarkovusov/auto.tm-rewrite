import type { ListingDraft } from "../ListingDraft";

export interface ListingDraftRepository {
  save(draft: ListingDraft): Promise<ListingDraft>;
  /**
   * Saves the draft only while its User owns fewer than `limit` drafts, and
   * returns null otherwise. Concurrent calls for one User must not exceed it.
   */
  saveWithinLimit(draft: ListingDraft, limit: number): Promise<ListingDraft | null>;
  findById(id: string): Promise<ListingDraft | null>;
  findByUserId(
    userId: string,
    opts?: { cursor?: { timestamp: string; id: string } | undefined; limit?: number | undefined },
  ): Promise<{ items: ListingDraft[]; nextCursor?: { timestamp: string; id: string } | undefined }>;
  update(draft: ListingDraft): Promise<ListingDraft>;
  delete(id: string): Promise<void>;
}

export const LISTING_DRAFT_REPOSITORY = Symbol("ListingDraftRepository");
