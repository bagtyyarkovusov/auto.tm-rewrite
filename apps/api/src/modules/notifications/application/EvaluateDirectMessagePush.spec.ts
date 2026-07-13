import { describe, it, expect, beforeEach } from "vitest";

import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import type { PushToken } from "../domain/PushToken";
import type { PushTokenRepository } from "../domain/ports/PushTokenRepository";
import { EvaluateDirectMessagePush } from "./EvaluateDirectMessagePush";

class FakeIdentityRead implements IdentityReadPort {
  blocks: Array<{ blockerId: string; blockedId: string }> = [];

  async findUserById(_id: string) {
    return null;
  }

  async findUsersByIds(_ids: string[]) {
    return [];
  }

  async isUserBlockedBy(
    blockerId: string,
    blockedId: string,
  ): Promise<boolean> {
    return this.blocks.some(
      (b) => b.blockerId === blockerId && b.blockedId === blockedId,
    );
  }
}

class FakePushTokenRepository implements PushTokenRepository {
  tokens: PushToken[] = [];

  async findByToken(_token: string): Promise<PushToken | null> {
    return null;
  }

  async findById(_id: string): Promise<PushToken | null> {
    return null;
  }

  async listActiveForUser(userId: string): Promise<PushToken[]> {
    return this.tokens.filter((t) => t.userId === userId && t.isActive());
  }

  async save(_token: PushToken): Promise<void> {}
  async update(_token: PushToken): Promise<void> {}
}

function makeToken(userId: string): PushToken {
  return {
    id: "token-1",
    userId,
    token: "apns-token",
    platform: "ios",
    deviceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
    invalidatedAt: null,
    isActive: () => true,
    touch: () => makeToken(userId),
    reassignTo: () => makeToken(userId),
    invalidate: () => makeToken(userId),
  } as PushToken;
}

function makeUseCase(
  identityRead?: FakeIdentityRead,
  tokens?: FakePushTokenRepository,
) {
  return new EvaluateDirectMessagePush(
    identityRead ?? new FakeIdentityRead(),
    tokens ?? new FakePushTokenRepository(),
  );
}

describe("EvaluateDirectMessagePush", () => {
  let identityRead: FakeIdentityRead;
  let tokens: FakePushTokenRepository;

  beforeEach(() => {
    identityRead = new FakeIdentityRead();
    tokens = new FakePushTokenRepository();
  });

  it("allows push when no block exists and recipient has tokens", async () => {
    tokens.tokens = [makeToken("recipient")];
    const uc = makeUseCase(identityRead, tokens);

    const result = await uc.execute({
      senderId: "sender",
      recipientId: "recipient",
    });

    expect(result).toEqual({ shouldSend: true });
  });

  it("suppresses push when recipient has blocked sender", async () => {
    identityRead.blocks.push({ blockerId: "recipient", blockedId: "sender" });
    tokens.tokens = [makeToken("recipient")];
    const uc = makeUseCase(identityRead, tokens);

    const result = await uc.execute({
      senderId: "sender",
      recipientId: "recipient",
    });

    expect(result).toEqual({ shouldSend: false, reason: "BLOCKED" });
  });

  it("suppresses push when sender has blocked recipient", async () => {
    identityRead.blocks.push({ blockerId: "sender", blockedId: "recipient" });
    tokens.tokens = [makeToken("recipient")];
    const uc = makeUseCase(identityRead, tokens);

    const result = await uc.execute({
      senderId: "sender",
      recipientId: "recipient",
    });

    expect(result).toEqual({ shouldSend: false, reason: "BLOCKED" });
  });

  it("suppresses push when recipient has no active tokens", async () => {
    const uc = makeUseCase(identityRead, tokens);

    const result = await uc.execute({
      senderId: "sender",
      recipientId: "recipient",
    });

    expect(result).toEqual({ shouldSend: false, reason: "NO_TOKENS" });
  });
});
