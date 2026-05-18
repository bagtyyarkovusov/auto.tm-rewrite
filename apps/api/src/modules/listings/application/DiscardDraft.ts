import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import {
  LISTING_DRAFT_REPOSITORY,
  type ListingDraftRepository,
} from "../domain/ports/ListingDraftRepository";

export interface DiscardDraftInput {
  draftId: string;
  userId: string;
}

@Injectable()
export class DiscardDraft {
  constructor(
    @Inject(LISTING_DRAFT_REPOSITORY)
    private readonly drafts: ListingDraftRepository,
  ) {}

  async execute(input: DiscardDraftInput): Promise<void> {
    const existing = await this.drafts.findById(input.draftId);
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException("Draft not found");
    }

    await this.drafts.delete(input.draftId);
  }
}
