import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { UpdateDraft } from "./UpdateDraft";
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

  async delete(_id: string): Promise<void> {
    this.drafts = this.drafts.filter((d) => d.id !== _id);
  }
}

function makeUseCase(repo?: FakeListingDraftRepository) {
  return new UpdateDraft(repo ?? new FakeListingDraftRepository());
}

describe("UpdateDraft", () => {
  let repo: FakeListingDraftRepository;

  beforeEach(() => {
    repo = new FakeListingDraftRepository();
  });

  it("patches the draft payload", async () => {
    const draft = ListingDraft.create({ id: "draft-1", userId: "user-1", payload: { vin: "old" } });
    repo.drafts.push(draft);

    const uc = makeUseCase(repo);
    const result = await uc.execute({
      draftId: "draft-1",
      userId: "user-1",
      payload: { vin: "new", brandId: "b1" },
    });

    expect(result.draft.payload).toEqual({ vin: "new", brandId: "b1" });
  });

  it("throws NotFoundException for non-existent draft", async () => {
    const uc = makeUseCase(repo);
    await expect(
      uc.execute({ draftId: "missing", userId: "user-1", payload: {} }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException for draft owned by another user", async () => {
    const draft = ListingDraft.create({ id: "draft-1", userId: "user-1" });
    repo.drafts.push(draft);

    const uc = makeUseCase(repo);
    await expect(
      uc.execute({ draftId: "draft-1", userId: "user-2", payload: {} }),
    ).rejects.toThrow(NotFoundException);
  });
});
