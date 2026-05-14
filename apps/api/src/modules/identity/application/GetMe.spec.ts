import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { User } from "../domain/User";
import type { UserRepository } from "../domain/ports/UserRepository";
import { GetMe } from "./GetMe";

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

  async findByPhone(_phone: string): Promise<User | null> { return null; }
  async create(_input: { phone: string }): Promise<User> {
    return makeUser();
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
}

function makeUseCase(userRepo?: FakeUserRepository) {
  return new GetMe(userRepo ?? new FakeUserRepository());
}

describe("GetMe", () => {
  let userRepo: FakeUserRepository;

  beforeEach(() => {
    userRepo = new FakeUserRepository();
  });

  it("returns the contract user shape for an existing user", async () => {
    const user = makeUser();
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.id).toBe("user-1");
    expect(result.phone).toBe("+99361234567");
    expect(result.displayName).toBe("Bagtyyar");
    expect(result.role).toBe("buyer");
    expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(result.locale).toBe("ru");
    expect(result.createdAt).toBe("2026-05-14T12:00:00.000Z");
  });

  it("returns nullable fields as null when not set", async () => {
    const user = makeUser({ displayName: null, avatarUrl: null });
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });

  it("throws 'User not found' when the user does not exist", async () => {
    const uc = makeUseCase(userRepo);

    await expect(
      uc.execute({ userId: "nonexistent" }),
    ).rejects.toThrow("User not found");
  });

  it("returns the correct role for non-buyer users", async () => {
    const user = makeUser({ id: "admin-1", role: "admin" });
    userRepo.users.set(user.id, user);

    const uc = makeUseCase(userRepo);
    const result = await uc.execute({ userId: "admin-1" });

    expect(result.role).toBe("admin");
  });
});
