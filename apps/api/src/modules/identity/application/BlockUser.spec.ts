import { describe, it, expect, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";

import type { BlockedUserRepository } from "../domain/ports/BlockedUserRepository";
import { BlockedUser } from "../domain/BlockedUser";
import { BlockUser } from "./BlockUser";

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
  return new BlockUser(repo ?? new FakeBlockedUserRepository());
}

describe("BlockUser", () => {
  let repo: FakeBlockedUserRepository;

  beforeEach(() => {
    repo = new FakeBlockedUserRepository();
  });

  it("creates a block relationship", async () => {
    const uc = makeUseCase(repo);
    const result = await uc.execute({
      blockerId: "user-a",
      blockedId: "user-b",
    });

    expect(result.blocked).toBe(true);
    expect(repo.records).toHaveLength(1);
    expect(repo.records[0]).toEqual({ blockerId: "user-a", blockedId: "user-b" });
  });

  it("is idempotent for an existing block", async () => {
    const uc = makeUseCase(repo);
    await uc.execute({ blockerId: "user-a", blockedId: "user-b" });
    const result = await uc.execute({ blockerId: "user-a", blockedId: "user-b" });

    expect(result.blocked).toBe(true);
    expect(repo.records).toHaveLength(1);
  });

  it("rejects self-blocking", async () => {
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({ blockerId: "user-a", blockedId: "user-a" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repo.records).toHaveLength(0);
  });

  it("allows both users to block each other independently", async () => {
    const uc = makeUseCase(repo);
    await uc.execute({ blockerId: "user-a", blockedId: "user-b" });
    await uc.execute({ blockerId: "user-b", blockedId: "user-a" });

    expect(repo.records).toHaveLength(2);
  });
});
