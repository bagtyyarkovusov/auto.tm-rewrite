import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { ListingDraft } from "../domain/ListingDraft";
import {
  LISTING_DRAFT_REPOSITORY,
  type ListingDraftRepository,
} from "../domain/ports/ListingDraftRepository";

export interface CreateDraftInput {
  userId: string;
  initialPayload?: Record<string, unknown>;
}

export interface CreateDraftResult {
  draft: ListingDraft;
}

@Injectable()
export class CreateDraft {
  constructor(
    @Inject(LISTING_DRAFT_REPOSITORY)
    private readonly drafts: ListingDraftRepository,
  ) {}

  async execute(input: CreateDraftInput): Promise<CreateDraftResult> {
    const draft = ListingDraft.create({
      id: randomUUID(),
      userId: input.userId,
      payload: input.initialPayload ?? {},
    });

    const saved = await this.drafts.save(draft);
    return { draft: saved };
  }
}
