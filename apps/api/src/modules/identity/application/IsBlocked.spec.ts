import { describe, it, expect, beforeEach } from "vitest";

import type { BlockedUserRepository } from "../domain/ports/BlockedUserRepository";
import { BlockedUser } from "../domain/BlockedUser";
import { IsBlocked } from "./IsBlocked";

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
  return new IsBlocked(repo ?? new FakeBlockedUserRepository());
}

describe("IsBlocked", () => {
  let repo: FakeBlockedUserRepository;

  beforeEach(() => {
    repo = new FakeBlockedUserRepository();
  });

  it("returns true when a block exists", async () => {
    await repo.block("user-a", "user-b");
    const uc = makeUseCase(repo);

    const result = await uc.execute({ blockerId: "user-a", blockedId: "user-b" });

    expect(result.blocked).toBe(true);
  });

  it("returns false when no block exists", async () => {
    const uc = makeUseCase(repo);

    const result = await uc.execute({ blockerId: "user-a", blockedId: "user-b" });

    expect(result.blocked).toBe(false);
  });

  it("returns false for the reverse direction", async () => {
    await repo.block("user-a", "user-b");
    const uc = makeUseCase(repo);

    const result = await uc.execute({ blockerId: "user-b", blockedId: "user-a" });

    expect(result.blocked).toBe(false);
  });
});
