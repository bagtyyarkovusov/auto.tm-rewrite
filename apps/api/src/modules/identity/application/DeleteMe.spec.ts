import { describe, it, expect, beforeEach } from "vitest";
import type { User } from "../domain/User";
import type { UserRepository } from "../domain/ports/UserRepository";
import { DeleteMe } from "./DeleteMe";

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
    ...overrides,
  };
}

class FakeUserRepository implements UserRepository {
  users: Map<string, User> = new Map();
  deletedIds: string[] = [];

  async findByPhone(_phone: string): Promise<User | null> { return null; }
  async create(_input: { phone: string }): Promise<User> {
    return makeUser();
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    if (!this.users.has(id)) {
      throw new Error("User not found");
    }
    this.users.delete(id);
    this.deletedIds.push(id);
  }
}

function makeUseCase(userRepo?: FakeUserRepository) {
  return new DeleteMe(userRepo ?? new FakeUserRepository());
}

describe("DeleteMe", () => {
  let userRepo: FakeUserRepository;

  beforeEach(() => {
    userRepo = new FakeUserRepository();
  });

  it("deletes an existing user", async () => {
    const user = makeUser();
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo);
    await uc.execute({ userId: "user-1" });

    expect(userRepo.users.has("user-1")).toBe(false);
    expect(userRepo.deletedIds).toContain("user-1");
  });

  it("throws 'User not found' when the user does not exist", async () => {
    const uc = makeUseCase(userRepo);

    await expect(
      uc.execute({ userId: "nonexistent" }),
    ).rejects.toThrow("User not found");
  });

  it("throws 'User not found' when the user has already been deleted", async () => {
    const user = makeUser();
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo);
    await uc.execute({ userId: "user-1" });

    // Second call on already-deleted user
    await expect(
      uc.execute({ userId: "user-1" }),
    ).rejects.toThrow("User not found");
  });

  it("does not throw for a user with non-buyer role", async () => {
    const user = makeUser({ id: "admin-1", role: "admin" });
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo);
    await expect(
      uc.execute({ userId: "admin-1" }),
    ).resolves.toBeUndefined();
  });
});
