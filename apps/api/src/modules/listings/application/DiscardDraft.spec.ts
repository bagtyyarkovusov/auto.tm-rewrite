import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { DiscardDraft } from "./DiscardDraft";
import { ListingDraft } from "../domain/ListingDraft";
import type { ListingDraftRepository } from "../domain/ports/ListingDraftRepository";

class FakeListingDraftRepository implements ListingDraftRepository {
  drafts: ListingDraft[] = [];

  async save(draft: ListingDraft): Promise<ListingDraft> {
    this.drafts.push(draft);
    return draft;
  }

  async findById(id: string): Promise<ListingDraft | null> {
    return this.drafts.find((d) => d.id === id) ?? null;
  }

  async findByUserId(
    _userId: string,
    _opts?: { cursor?: { timestamp: string; id: string } | undefined; limit?: number | undefined },
  ): Promise<{ items: ListingDraft[]; nextCursor?: { timestamp: string; id: string } | undefined }> {
    return { items: this.drafts };
  }

  async update(draft: ListingDraft): Promise<ListingDraft> {
    const idx = this.drafts.findIndex((d) => d.id === draft.id);
    if (idx >= 0) this.drafts[idx] = draft;
    return draft;
  }

  async delete(id: string): Promise<void> {
    this.drafts = this.drafts.filter((d) => d.id !== id);
  }
}

function makeUseCase(repo?: FakeListingDraftRepository) {
  return new DiscardDraft(repo ?? new FakeListingDraftRepository());
}

describe("DiscardDraft", () => {
  let repo: FakeListingDraftRepository;

  beforeEach(() => {
    repo = new FakeListingDraftRepository();
  });

  it("deletes the draft when owned by caller", async () => {
    repo.drafts.push(ListingDraft.create({ id: "draft-1", userId: "user-1" }));

    const uc = makeUseCase(repo);
    await uc.execute({ draftId: "draft-1", userId: "user-1" });

    expect(repo.drafts).toHaveLength(0);
  });

  it("throws NotFoundException for non-existent draft", async () => {
    const uc = makeUseCase(repo);
    await expect(
      uc.execute({ draftId: "missing", userId: "user-1" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException for draft owned by another user", async () => {
    repo.drafts.push(ListingDraft.create({ id: "draft-1", userId: "user-1" }));

    const uc = makeUseCase(repo);
    await expect(
      uc.execute({ draftId: "draft-1", userId: "user-2" }),
    ).rejects.toThrow(NotFoundException);
  });
});
