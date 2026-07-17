import { describe, it, expect, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";

import { PushToken } from "../domain/PushToken";
import type { PushTokenRepository } from "../domain/ports/PushTokenRepository";
import { PUSH_TOKEN_ERROR_CODES } from "../domain/types";

import { RegisterPushToken } from "./RegisterPushToken";

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
}

function makeUseCase(repo?: FakePushTokenRepository) {
  return new RegisterPushToken(repo ?? new FakePushTokenRepository());
}

describe("RegisterPushToken", () => {
  let repo: FakePushTokenRepository;

  beforeEach(() => {
    repo = new FakePushTokenRepository();
  });

  it("registers a new native token for the authenticated user", async () => {
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "user-1",
      token: "fcm-token-1",
      platform: "android",
      deviceId: "device-1",
    });

    expect(result.token.userId).toBe("user-1");
    expect(result.token.token).toBe("fcm-token-1");
    expect(result.token.platform).toBe("android");
    expect(result.token.deviceId).toBe("device-1");
    expect(result.token.isActive()).toBe(true);
    expect(result.invalidatedPrevious).toBe(false);
    expect(repo.tokens).toHaveLength(1);
  });

  it("registers an APNS token for iOS", async () => {
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "user-1",
      token: "apns-token-1",
      platform: "ios",
    });

    expect(result.token.platform).toBe("ios");
    expect(result.token.isActive()).toBe(true);
  });

  it("trims whitespace from token", async () => {
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "user-1",
      token: "  fcm-token-1  ",
      platform: "android",
    });

    expect(result.token.token).toBe("fcm-token-1");
  });

  it("updates lastSeenAt and reactivates when the same user re-registers", async () => {
    const uc = makeUseCase(repo);

    const first = await uc.execute({
      userId: "user-1",
      token: "fcm-token-1",
      platform: "android",
    });

    const second = await uc.execute({
      userId: "user-1",
      token: "fcm-token-1",
      platform: "android",
    });

    expect(second.token.id).toBe(first.token.id);
    expect(second.token.lastSeenAt.getTime()).toBeGreaterThanOrEqual(
      first.token.lastSeenAt.getTime(),
    );
    expect(repo.tokens).toHaveLength(1);
    expect(second.invalidatedPrevious).toBe(false);
  });

  it("reassigns token to a new user when the same native token was owned by someone else", async () => {
    const uc = makeUseCase(repo);

    await uc.execute({
      userId: "user-1",
      token: "fcm-token-1",
      platform: "android",
    });

    const result = await uc.execute({
      userId: "user-2",
      token: "fcm-token-1",
      platform: "android",
    });

    expect(result.token.userId).toBe("user-2");
    expect(result.invalidatedPrevious).toBe(true);

    // Because the token column is unique, only one row exists and it now
    // belongs to the current user.
    expect(repo.tokens).toHaveLength(1);
    expect(repo.tokens[0]?.userId).toBe("user-2");
    expect(repo.tokens[0]?.isActive()).toBe(true);
  });

  it("rejects blank token", async () => {
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({
        userId: "user-1",
        token: "   ",
        platform: "android",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects empty token", async () => {
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({
        userId: "user-1",
        token: "",
        platform: "android",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects missing platform", async () => {
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({
        userId: "user-1",
        token: "fcm-token-1",
        platform: "" as "android",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects invalid platform", async () => {
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({
        userId: "user-1",
        token: "fcm-token-1",
        platform: "windows" as "android",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("includes the correct error reason for missing token", async () => {
    const uc = makeUseCase(repo);

    try {
      await uc.execute({
        userId: "user-1",
        token: "",
        platform: "android",
      });
      expect.fail("expected exception");
    } catch (err) {
      const ex = err as BadRequestException;
      const body = ex.getResponse() as { details?: { reason?: string } };
      expect(body.details?.reason).toBe(PUSH_TOKEN_ERROR_CODES.TOKEN_REQUIRED);
    }
  });
});
