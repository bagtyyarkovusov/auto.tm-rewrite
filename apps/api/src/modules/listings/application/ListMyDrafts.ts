import { Inject, Injectable } from "@nestjs/common";

import { ListingDraft } from "../domain/ListingDraft";
import {
  LISTING_DRAFT_REPOSITORY,
  type ListingDraftRepository,
} from "../domain/ports/ListingDraftRepository";
import type { FeedCursor } from "../domain/types";

export interface ListMyDraftsInput {
  userId: string;
  cursor?: FeedCursor | undefined;
  limit?: number | undefined;
}

export interface ListMyDraftsResult {
  items: ListingDraft[];
  nextCursor?: FeedCursor | undefined;
}

@Injectable()
export class ListMyDrafts {
  constructor(
    @Inject(LISTING_DRAFT_REPOSITORY)
    private readonly drafts: ListingDraftRepository,
  ) {}

  async execute(input: ListMyDraftsInput): Promise<ListMyDraftsResult> {
    const { items, nextCursor } = await this.drafts.findByUserId(
      input.userId,
      {
        ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      },
    );

    return { items, nextCursor };
  }
}
