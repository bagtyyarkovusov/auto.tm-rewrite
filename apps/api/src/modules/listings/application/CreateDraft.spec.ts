import { describe, it, expect, beforeEach } from "vitest";
import { CreateDraft } from "./CreateDraft";
import { ListingDraft } from "../domain/ListingDraft";
import type { ListingDraftRepository } from "../domain/ports/ListingDraftRepository";

class FakeListingDraftRepository implements ListingDraftRepository {
  drafts: ListingDraft[] = [];

  async save(draft: ListingDraft): Promise<ListingDraft> {
    this.drafts.push(draft);
    return draft;
  }

  async findById(_id: string): Promise<ListingDraft | null> {
    return this.drafts.find((d) => d.id === _id) ?? null;
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
  return new CreateDraft(repo ?? new FakeListingDraftRepository());
}

describe("CreateDraft", () => {
  let repo: FakeListingDraftRepository;

  beforeEach(() => {
    repo = new FakeListingDraftRepository();
  });

  it("creates a draft with empty payload by default", async () => {
    const uc = makeUseCase(repo);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.draft.userId).toBe("user-1");
    expect(result.draft.payload).toEqual({});
    expect(repo.drafts).toHaveLength(1);
  });

  it("creates a draft with initial payload when provided", async () => {
    const uc = makeUseCase(repo);
    const result = await uc.execute({
      userId: "user-1",
      initialPayload: { vin: "WBA123456789" },
    });

    expect(result.draft.payload).toEqual({ vin: "WBA123456789" });
  });
});
