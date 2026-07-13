import { describe, it, expect, beforeEach } from "vitest";

import { PushToken } from "../domain/PushToken";
import type { PushTokenRepository } from "../domain/ports/PushTokenRepository";

import { ListPushTokens } from "./ListPushTokens";

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
  return new ListPushTokens(repo ?? new FakePushTokenRepository());
}

describe("ListPushTokens", () => {
  let repo: FakePushTokenRepository;

  beforeEach(() => {
    repo = new FakePushTokenRepository();
  });

  it("returns only active tokens for the user", async () => {
    repo.seed(
      PushToken.create({
        id: "token-1",
        userId: "user-1",
        token: "fcm-token-1",
        platform: "android",
      }),
    );
    repo.seed(
      PushToken.create({
        id: "token-2",
        userId: "user-1",
        token: "apns-token-1",
        platform: "ios",
      }),
    );
    repo.seed(
      PushToken.create({
        id: "token-3",
        userId: "user-1",
        token: "old-token",
        platform: "android",
        invalidatedAt: new Date(),
      }),
    );
    repo.seed(
      PushToken.create({
        id: "token-4",
        userId: "user-2",
        token: "other-user-token",
        platform: "android",
      }),
    );

    const uc = makeUseCase(repo);
    const result = await uc.execute({ userId: "user-1" });

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.token).sort()).toEqual([
      "apns-token-1",
      "fcm-token-1",
    ]);
  });

  it("returns empty array when user has no tokens", async () => {
    const uc = makeUseCase(repo);
    const result = await uc.execute({ userId: "user-1" });

    expect(result).toEqual([]);
  });
});
