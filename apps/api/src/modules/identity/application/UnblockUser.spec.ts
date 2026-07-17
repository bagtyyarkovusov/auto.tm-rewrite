import { describe, it, expect, beforeEach } from "vitest";

import type { BlockedUserRepository } from "../domain/ports/BlockedUserRepository";
import { BlockedUser } from "../domain/BlockedUser";
import { UnblockUser } from "./UnblockUser";

class FakeBlockedUserRepository implements BlockedUserRepository {
  records: Array<{ blockerId: string; blockedId: string }> = [];

  async block(
    blockerId: string,
    blockedId: string,
  ): Promise<BlockedUser> {
    const existing = this.records.find(
      (r) => r.blockerId === blockerId && r.blockedId === blockedId,
    );
    if (!existing) {
      this.records.push({ blockerId, blockedId });
    }
    return BlockedUser.create({
      id: "block-1",
      blockerId,
      blockedId,
      createdAt: new Date("2026-07-13T12:00:00Z"),
    });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    this.records = this.records.filter(
      (r) => !(r.blockerId === blockerId && r.blockedId === blockedId),
    );
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return this.records.some(
      (r) => r.blockerId === blockerId && r.blockedId === blockedId,
    );
  }
}

function makeUseCase(repo?: FakeBlockedUserRepository) {
  return new UnblockUser(repo ?? new FakeBlockedUserRepository());
}

describe("UnblockUser", () => {
  let repo: FakeBlockedUserRepository;

  beforeEach(() => {
    repo = new FakeBlockedUserRepository();
  });

  it("removes an existing block", async () => {
    await repo.block("user-a", "user-b");
    const uc = makeUseCase(repo);

    const result = await uc.execute({ blockerId: "user-a", blockedId: "user-b" });

    expect(result.unblocked).toBe(true);
    expect(repo.records).toHaveLength(0);
  });

  it("is idempotent when no block exists", async () => {
    const uc = makeUseCase(repo);

    const result = await uc.execute({ blockerId: "user-a", blockedId: "user-b" });

    expect(result.unblocked).toBe(true);
    expect(repo.records).toHaveLength(0);
  });

  it("only removes the blocker-direction relationship", async () => {
    await repo.block("user-a", "user-b");
    await repo.block("user-b", "user-a");
    const uc = makeUseCase(repo);

    await uc.execute({ blockerId: "user-a", blockedId: "user-b" });

    expect(repo.records).toHaveLength(1);
    expect(repo.records[0]).toEqual({ blockerId: "user-b", blockedId: "user-a" });
  });
});
