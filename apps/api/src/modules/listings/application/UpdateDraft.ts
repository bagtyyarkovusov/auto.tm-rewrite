import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { ListingDraft } from "../domain/ListingDraft";
import {
  LISTING_DRAFT_REPOSITORY,
  type ListingDraftRepository,
} from "../domain/ports/ListingDraftRepository";

export interface UpdateDraftInput {
  draftId: string;
  userId: string;
  payload: Record<string, unknown>;
}

export interface UpdateDraftResult {
  draft: ListingDraft;
}

@Injectable()
export class UpdateDraft {
  constructor(
    @Inject(LISTING_DRAFT_REPOSITORY)
    private readonly drafts: ListingDraftRepository,
  ) {}

  async execute(input: UpdateDraftInput): Promise<UpdateDraftResult> {
    const existing = await this.drafts.findById(input.draftId);
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException("Draft not found");
    }

    const updated = existing.updatePayload(input.payload, new Date());
    const saved = await this.drafts.update(updated);
    return { draft: saved };
  }
}
