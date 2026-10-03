import { describe, it, expect, beforeEach } from "vitest";
import { ConflictException } from "@nestjs/common";
import { CreateDraft } from "./CreateDraft";
import { ListingDraft } from "../domain/ListingDraft";
import type { ListingDraftRepository } from "../domain/ports/ListingDraftRepository";

class FakeListingDraftRepository implements ListingDraftRepository {
  drafts: ListingDraft[] = [];

  async save(draft: ListingDraft): Promise<ListingDraft> {
    this.drafts.push(draft);
    return draft;
  }

  async saveWithinLimit(draft: ListingDraft, limit: number): Promise<ListingDraft | null> {
    const owned = this.drafts.filter((d) => d.userId === draft.userId).length;
    if (owned >= limit) return null;
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

  describe("five-draft limit", () => {
    async function seed(userId: string, count: number) {
      const uc = makeUseCase(repo);
      for (let i = 0; i < count; i += 1) await uc.execute({ userId });
    }

    it("refuses a sixth draft with 409 DRAFT_LIMIT_REACHED and creates nothing", async () => {
      await seed("user-1", 5);
      const uc = makeUseCase(repo);

      const error = await uc.execute({ userId: "user-1" }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(409);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: "DRAFT_LIMIT_REACHED",
      });
      expect(repo.drafts.filter((d) => d.userId === "user-1")).toHaveLength(5);
    });

    it("allows the fifth draft", async () => {
      await seed("user-1", 4);
      const uc = makeUseCase(repo);

      await uc.execute({ userId: "user-1" });

      expect(repo.drafts).toHaveLength(5);
    });

    it("frees a place when a draft is removed", async () => {
      await seed("user-1", 5);
      await repo.delete(repo.drafts[0]!.id);
      const uc = makeUseCase(repo);

      await uc.execute({ userId: "user-1" });

      expect(repo.drafts).toHaveLength(5);
    });

    it("counts only the caller's drafts", async () => {
      await seed("user-2", 5);
      const uc = makeUseCase(repo);

      await uc.execute({ userId: "user-1" });

      expect(repo.drafts.filter((d) => d.userId === "user-1")).toHaveLength(1);
    });
  });
});
