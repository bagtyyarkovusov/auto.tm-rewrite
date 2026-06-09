import { describe, it, expect, beforeEach } from "vitest";
import type { User } from "../domain/User";
import type { UserRepository } from "../domain/ports/UserRepository";
import type { SessionRepository } from "../domain/ports/SessionRepository";
import type { AccountDeletionListingsPort } from "../domain/ports/AccountDeletionListingsPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import { DeleteMe } from "./DeleteMe";

const NOW = new Date("2026-05-14T12:00:00Z");
const GRACE_30D = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    phone: "+99361234567",
    displayName: "Bagtyyar",
    avatarUrl: "https://example.com/avatar.jpg",
    locale: "ru",
    role: "buyer",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    deletionScheduledAt: null,
    ...overrides,
  };
}

class FakeUserRepository implements UserRepository {
  users: Map<string, User> = new Map();
  scheduledDeletions: Map<string, Date> = new Map();

  async findByPhone(_phone: string): Promise<User | null> { return null; }
  async create(_input: { phone: string }): Promise<User> { return makeUser(); }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    if (!this.users.has(id)) {
      throw new Error("User not found");
    }
    this.users.delete(id);
  }

  async scheduleDeletion(userId: string, deletionScheduledAt: Date): Promise<void> {
    this.scheduledDeletions.set(userId, deletionScheduledAt);
  }

  async clearDeletionSchedule(_userId: string): Promise<void> {}
  async findUsersWithExpiredDeletionGrace(_now: Date): Promise<User[]> { return []; }
  async tombstoneUser(_userId: string): Promise<void> {}
}

class FakeSessionRepository implements SessionRepository {
  deletedAllForUserId: string | null = null;

  async create(): Promise<never> { throw new Error("not implemented"); }
  async countByUserId(): Promise<number> { return 0; }
  async deleteExpiredByUserId(): Promise<number> { return 0; }
  async deleteOldestByUserId(): Promise<void> {}
  async findByRefreshToken(): Promise<null> { return null; }
  async rotateRefreshToken(): Promise<boolean> { return false; }
  async findById(): Promise<null> { return null; }
  async updateAdminTotpExpiresAt(): Promise<void> {}
  async delete(): Promise<void> {}
  async deleteAllByUserId(userId: string): Promise<number> {
    this.deletedAllForUserId = userId;
    return 1;
  }
}

class FakeListingsPort implements AccountDeletionListingsPort {
  archivedSellerId: string | null = null;
  republishedSellerId: string | null = null;

  async archiveActiveListingsBySeller(sellerId: string): Promise<void> {
    this.archivedSellerId = sellerId;
  }

  async republishArchivedByDeletionListingsBySeller(sellerId: string): Promise<void> {
    this.republishedSellerId = sellerId;
  }
}

class FakeClock implements ClockPort {
  now(): Date {
    return NOW;
  }
}

function makeUseCase(
  userRepo?: FakeUserRepository,
  sessionRepo?: FakeSessionRepository,
  listingsPort?: FakeListingsPort,
  clock?: FakeClock,
) {
  return new DeleteMe(
    userRepo ?? new FakeUserRepository(),
    sessionRepo ?? new FakeSessionRepository(),
    listingsPort ?? new FakeListingsPort(),
    clock ?? new FakeClock(),
  );
}

describe("DeleteMe", () => {
  let userRepo: FakeUserRepository;
  let sessionRepo: FakeSessionRepository;
  let listingsPort: FakeListingsPort;
  let clock: FakeClock;

  beforeEach(() => {
    userRepo = new FakeUserRepository();
    sessionRepo = new FakeSessionRepository();
    listingsPort = new FakeListingsPort();
    clock = new FakeClock();
  });

  it("schedules deletion 30 days in the future for an existing user", async () => {
    const user = makeUser();
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo, sessionRepo, listingsPort, clock);
    await uc.execute({ userId: "user-1" });

    expect(userRepo.scheduledDeletions.get("user-1")?.toISOString()).toBe(GRACE_30D.toISOString());
  });

  it("revokes all sessions for the user", async () => {
    const user = makeUser();
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo, sessionRepo, listingsPort, clock);
    await uc.execute({ userId: "user-1" });

    expect(sessionRepo.deletedAllForUserId).toBe("user-1");
  });

  it("archives active listings tagged archivedByDeletion", async () => {
    const user = makeUser();
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo, sessionRepo, listingsPort, clock);
    await uc.execute({ userId: "user-1" });

    expect(listingsPort.archivedSellerId).toBe("user-1");
  });

  it("does not delete the user row", async () => {
    const user = makeUser();
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo, sessionRepo, listingsPort, clock);
    await uc.execute({ userId: "user-1" });

    expect(userRepo.users.has("user-1")).toBe(true);
  });

  it("throws 'User not found' when the user does not exist", async () => {
    const uc = makeUseCase(userRepo, sessionRepo, listingsPort, clock);

    await expect(
      uc.execute({ userId: "nonexistent" }),
    ).rejects.toThrow("User not found");
  });

  it("is idempotent for a tombstoned user (re-schedules deletion)", async () => {
    const user = makeUser({ phone: "deleted:user-1" });
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo, sessionRepo, listingsPort, clock);
    await expect(
      uc.execute({ userId: "user-1" }),
    ).resolves.toBeUndefined();

    expect(userRepo.scheduledDeletions.get("user-1")?.toISOString()).toBe(GRACE_30D.toISOString());
  });
});
