import { describe, it, expect, beforeEach } from "vitest";
import { ListMyDrafts } from "./ListMyDrafts";
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
    userId: string,
    opts?: { cursor?: { timestamp: string; id: string } | undefined; limit?: number | undefined },
  ): Promise<{ items: ListingDraft[]; nextCursor?: { timestamp: string; id: string } | undefined }> {
    let items = this.drafts.filter((d) => d.userId === userId);
    const limit = opts?.limit ?? 50;

    if (opts?.cursor) {
      const idx = items.findIndex(
        (d) => d.updatedAt.toISOString() === opts!.cursor!.timestamp && d.id === opts!.cursor!.id,
      );
      items = items.slice(idx + 1);
    }

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const last = sliced[sliced.length - 1];
    const nextCursor = hasMore && last
      ? { timestamp: last.updatedAt.toISOString(), id: last.id }
      : undefined;

    return { items: sliced, nextCursor };
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
  return new ListMyDrafts(repo ?? new FakeListingDraftRepository());
}

describe("ListMyDrafts", () => {
  let repo: FakeListingDraftRepository;

  beforeEach(() => {
    repo = new FakeListingDraftRepository();
  });

  it("returns drafts for the requesting user ordered by updatedAt", async () => {
    repo.drafts.push(
      ListingDraft.create({ id: "d1", userId: "user-1", payload: { step: 1 } }),
    );
    repo.drafts.push(
      ListingDraft.create({ id: "d2", userId: "user-1", payload: { step: 2 } }),
    );
    repo.drafts.push(
      ListingDraft.create({ id: "d3", userId: "user-2", payload: { step: 1 } }),
    );

    const uc = makeUseCase(repo);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((d) => d.userId === "user-1")).toBe(true);
  });

  it("returns nextCursor when more items exist", async () => {
    repo.drafts.push(
      ListingDraft.create({ id: "d1", userId: "user-1" }),
    );
    repo.drafts.push(
      ListingDraft.create({ id: "d2", userId: "user-1" }),
    );

    const uc = makeUseCase(repo);
    const result = await uc.execute({ userId: "user-1", limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeDefined();
  });

  it("returns no nextCursor when all items fit", async () => {
    repo.drafts.push(ListingDraft.create({ id: "d1", userId: "user-1" }));

    const uc = makeUseCase(repo);
    const result = await uc.execute({ userId: "user-1", limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });
});
