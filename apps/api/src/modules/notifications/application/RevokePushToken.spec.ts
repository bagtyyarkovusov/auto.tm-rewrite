import { describe, it, expect, beforeEach } from "vitest";

import { PushToken } from "../domain/PushToken";
import type { PushTokenRepository } from "../domain/ports/PushTokenRepository";

import { RevokePushToken } from "./RevokePushToken";

class FakePushTokenRepository implements PushTokenRepository {
  tokens: PushToken[] = [];

  async findByToken(token: string): Promise<PushToken | null> {
    return this.tokens.find((t) => t.token === token) ?? null;
  }

  async findById(id: string): Promise<PushToken | null> {
    return this.tokens.find((t) => t.id === id) ?? null;
  }

  async listActiveForUser(userId: string): Promise<PushToken[]> {
    return this.tokens.filter((t) => t.userId === userId && t.isActive());
  }

  async save(token: PushToken): Promise<void> {
    const index = this.tokens.findIndex((t) => t.token === token.token);
    if (index >= 0) {
      this.tokens[index] = token;
    } else {
      this.tokens.push(token);
    }
  }

  async update(token: PushToken): Promise<void> {
    await this.save(token);
  }

  seed(token: PushToken) {
    this.tokens.push(token);
  }
}

function makeUseCase(repo?: FakePushTokenRepository) {
  return new RevokePushToken(repo ?? new FakePushTokenRepository());
}

describe("RevokePushToken", () => {
  let repo: FakePushTokenRepository;

  beforeEach(() => {
    repo = new FakePushTokenRepository();
  });

  it("revokes an active token owned by the user", async () => {
    repo.seed(
      PushToken.create({
        id: "token-1",
        userId: "user-1",
        token: "fcm-token-1",
        platform: "android",
      }),
    );
    const uc = makeUseCase(repo);

    const result = await uc.execute({ userId: "user-1", token: "fcm-token-1" });

    expect(result.revoked).toBe(true);
    expect(repo.tokens[0]?.isActive()).toBe(false);
  });

  it("returns revoked=true when token is already invalidated", async () => {
    repo.seed(
      PushToken.create({
        id: "token-1",
        userId: "user-1",
        token: "fcm-token-1",
        platform: "android",
        invalidatedAt: new Date(),
      }),
    );
    const uc = makeUseCase(repo);

    const result = await uc.execute({ userId: "user-1", token: "fcm-token-1" });

    expect(result.revoked).toBe(true);
  });

  it("returns revoked=false when token does not exist", async () => {
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "user-1",
      token: "missing-token",
    });

    expect(result.revoked).toBe(false);
  });

  it("returns revoked=false when token belongs to another user", async () => {
    repo.seed(
      PushToken.create({
        id: "token-1",
        userId: "user-2",
        token: "fcm-token-1",
        platform: "android",
      }),
    );
    const uc = makeUseCase(repo);

    const result = await uc.execute({ userId: "user-1", token: "fcm-token-1" });

    expect(result.revoked).toBe(false);
    expect(repo.tokens[0]?.isActive()).toBe(true);
  });
});
