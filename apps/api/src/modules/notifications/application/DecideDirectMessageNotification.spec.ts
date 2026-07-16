import { describe, it, expect, beforeEach } from "vitest";

import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import type { PresencePort } from "../../realtime/domain/ports/PresencePort";
import type { ConversationStatePort } from "../../conversations/domain/ports/ConversationStatePort";
import type { MessageSentEvent } from "../../conversations/domain/ports/MessageEventPublisher";
import type { PushToken } from "../domain/PushToken";
import type { PushTokenRepository } from "../domain/ports/PushTokenRepository";
import type { DirectMessageNotification } from "../domain/DirectMessageNotification";
import type { NotificationHistoryRepository } from "../domain/ports/NotificationHistoryRepository";
import type { PushQueuePort } from "../domain/ports/PushQueuePort";
import {
  DIRECT_MESSAGE_NOTIFICATION_CATEGORY,
  DIRECT_MESSAGE_NOTIFICATION_TITLE,
  DIRECT_MESSAGE_PREVIEW_DELETED,
  DIRECT_MESSAGE_PREVIEW_IMAGE,
  DIRECT_MESSAGE_PREVIEW_POST_REF,
  DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS,
} from "../domain/types";

import { EvaluateDirectMessagePush } from "./EvaluateDirectMessagePush";
import { DecideDirectMessageNotification } from "./DecideDirectMessageNotification";

class FakeIdentityRead implements IdentityReadPort {
  blocks: Array<{ blockerId: string; blockedId: string }> = [];

  async findUserById() {
    return null;
  }

  async findUsersByIds() {
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

  async findByToken() {
    return null;
  }

  async findById() {
    return null;
  }

  async listActiveForUser(userId: string): Promise<PushToken[]> {
    return this.tokens.filter((t) => t.userId === userId && t.isActive());
  }

  async save() {}
  async update() {}
}

class FakePresence implements PresencePort {
  onlineUsers = new Set<string>();

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getSocketCountForUser(): number {
    return 0;
  }

  getOnlineUserCount(): number {
    return 0;
  }

  getLastSeenAt(): Date | undefined {
    return undefined;
  }
}

class FakeConversationState implements ConversationStatePort {
  mutedConversations: Array<{ conversationId: string; userId: string }> = [];

  async isMuted(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    return this.mutedConversations.some(
      (m) => m.conversationId === conversationId && m.userId === userId,
    );
  }
}

class FakeNotificationHistoryRepository
  implements NotificationHistoryRepository
{
  rows: DirectMessageNotification[] = [];
  nextId = 1;

  async save(notification: DirectMessageNotification): Promise<{ id: string }> {
    this.rows.push(notification);
    return { id: `history-${this.nextId++}` };
  }
}

class FakePushQueue implements PushQueuePort {
  jobs: Array<{
    notification: DirectMessageNotification;
    historyId: string;
  }> = [];

  async enqueue(
    notification: DirectMessageNotification,
    historyId: string,
  ): Promise<void> {
    this.jobs.push({ notification, historyId });
  }
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

function makeTextEvent(overrides?: Partial<MessageSentEvent>): MessageSentEvent {
  return {
    event: "MessageSent",
    conversationId: "conv-1",
    messageId: "msg-1",
    senderId: "user-a",
    recipientId: "user-b",
    sentAt: new Date().toISOString(),
    messageKind: "text",
    messageBody: "Hello",
    messageMetadata: null,
    messageDeletedAt: null,
    ...overrides,
  };
}

function makeUseCase(deps?: {
  identityRead?: FakeIdentityRead;
  tokens?: FakePushTokenRepository;
  presence?: FakePresence;
  conversationState?: FakeConversationState;
  history?: FakeNotificationHistoryRepository;
  queue?: FakePushQueue;
}) {
  const identityRead = deps?.identityRead ?? new FakeIdentityRead();
  const tokens = deps?.tokens ?? new FakePushTokenRepository();
  const evaluate = new EvaluateDirectMessagePush(identityRead, tokens);

  return new DecideDirectMessageNotification(
    deps?.presence ?? new FakePresence(),
    deps?.conversationState ?? new FakeConversationState(),
    evaluate,
    deps?.history ?? new FakeNotificationHistoryRepository(),
    deps?.queue ?? new FakePushQueue(),
  );
}

describe("DecideDirectMessageNotification", () => {
  let identityRead: FakeIdentityRead;
  let tokens: FakePushTokenRepository;
  let presence: FakePresence;
  let conversationState: FakeConversationState;
  let history: FakeNotificationHistoryRepository;
  let queue: FakePushQueue;

  beforeEach(() => {
    identityRead = new FakeIdentityRead();
    tokens = new FakePushTokenRepository();
    presence = new FakePresence();
    conversationState = new FakeConversationState();
    history = new FakeNotificationHistoryRepository();
    queue = new FakePushQueue();
  });

  it("enqueues one push and records history for an eligible text message", async () => {
    tokens.tokens = [makeToken("user-b")];
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    const result = await uc.execute(makeTextEvent());

    expect(result).toEqual({ enqueued: true });
    expect(queue.jobs).toHaveLength(1);
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0]!.userId).toBe("user-b");
    expect(history.rows[0]!.category).toBe(DIRECT_MESSAGE_NOTIFICATION_CATEGORY);
    expect(history.rows[0]!.title).toBe(DIRECT_MESSAGE_NOTIFICATION_TITLE);
    expect(history.rows[0]!.body).toBe("Hello");
    expect(history.rows[0]!.deepLink).toBe("/conversations/conv-1");
    expect(history.rows[0]!.data.conversationId).toBe("conv-1");
    expect(history.rows[0]!.data.messageId).toBe("msg-1");
    expect(history.rows[0]!.data.preview).toEqual({
      kind: "text",
      text: "Hello",
    });
  });

  it("suppresses push when the sender is the recipient", async () => {
    tokens.tokens = [makeToken("user-a")];
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    const result = await uc.execute(
      makeTextEvent({ senderId: "user-a", recipientId: "user-a" }),
    );

    expect(result).toEqual({
      enqueued: false,
      reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.SELF_MESSAGE,
    });
    expect(queue.jobs).toHaveLength(0);
    expect(history.rows).toHaveLength(0);
  });

  it("suppresses push when the recipient is online", async () => {
    tokens.tokens = [makeToken("user-b")];
    presence.onlineUsers.add("user-b");
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    const result = await uc.execute(makeTextEvent());

    expect(result).toEqual({
      enqueued: false,
      reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.RECIPIENT_ONLINE,
    });
    expect(queue.jobs).toHaveLength(0);
    expect(history.rows).toHaveLength(0);
  });

  it("suppresses push when the conversation is muted for the recipient", async () => {
    tokens.tokens = [makeToken("user-b")];
    conversationState.mutedConversations.push({
      conversationId: "conv-1",
      userId: "user-b",
    });
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    const result = await uc.execute(makeTextEvent());

    expect(result).toEqual({
      enqueued: false,
      reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.CONVERSATION_MUTED,
    });
    expect(queue.jobs).toHaveLength(0);
    expect(history.rows).toHaveLength(0);
  });

  it("suppresses push when the recipient has blocked the sender", async () => {
    tokens.tokens = [makeToken("user-b")];
    identityRead.blocks.push({ blockerId: "user-b", blockedId: "user-a" });
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    const result = await uc.execute(makeTextEvent());

    expect(result).toEqual({
      enqueued: false,
      reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.BLOCKED,
    });
    expect(queue.jobs).toHaveLength(0);
    expect(history.rows).toHaveLength(0);
  });

  it("suppresses push when the sender has blocked the recipient", async () => {
    tokens.tokens = [makeToken("user-b")];
    identityRead.blocks.push({ blockerId: "user-a", blockedId: "user-b" });
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    const result = await uc.execute(makeTextEvent());

    expect(result).toEqual({
      enqueued: false,
      reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.BLOCKED,
    });
    expect(queue.jobs).toHaveLength(0);
    expect(history.rows).toHaveLength(0);
  });

  it("does nothing when the recipient has no active tokens", async () => {
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    const result = await uc.execute(makeTextEvent());

    expect(result).toEqual({
      enqueued: false,
      reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.NO_TOKENS,
    });
    expect(queue.jobs).toHaveLength(0);
    expect(history.rows).toHaveLength(0);
  });

  it("uses a generic image preview for image messages", async () => {
    tokens.tokens = [makeToken("user-b")];
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    await uc.execute(
      makeTextEvent({
        messageKind: "image",
        messageBody: null,
        messageMetadata: { key: "chat/image.jpg" },
      }),
    );

    expect(queue.jobs[0]!.notification.body).toBe(DIRECT_MESSAGE_PREVIEW_IMAGE);
    expect(history.rows[0]!.body).toBe(DIRECT_MESSAGE_PREVIEW_IMAGE);
    expect(history.rows[0]!.data.preview).toEqual({
      kind: "image",
      text: DIRECT_MESSAGE_PREVIEW_IMAGE,
    });
  });

  it("uses a generic post_ref preview for listing-reference messages", async () => {
    tokens.tokens = [makeToken("user-b")];
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    await uc.execute(
      makeTextEvent({
        messageKind: "post_ref",
        messageBody: null,
        messageMetadata: { listingId: "listing-1" } as MessageSentEvent["messageMetadata"],
      }),
    );

    expect(queue.jobs[0]!.notification.body).toBe(
      DIRECT_MESSAGE_PREVIEW_POST_REF,
    );
    expect(history.rows[0]!.body).toBe(DIRECT_MESSAGE_PREVIEW_POST_REF);
    expect(history.rows[0]!.data.preview).toEqual({
      kind: "post_ref",
      text: DIRECT_MESSAGE_PREVIEW_POST_REF,
    });
  });

  it("uses a generic deleted preview for deleted text messages", async () => {
    tokens.tokens = [makeToken("user-b")];
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    await uc.execute(
      makeTextEvent({
        messageBody: "Deleted text",
        messageDeletedAt: new Date().toISOString(),
      }),
    );

    expect(queue.jobs[0]!.notification.body).toBe(
      DIRECT_MESSAGE_PREVIEW_DELETED,
    );
    expect(history.rows[0]!.body).toBe(DIRECT_MESSAGE_PREVIEW_DELETED);
    expect(history.rows[0]!.data.preview.text).toBe(
      DIRECT_MESSAGE_PREVIEW_DELETED,
    );
  });

  it("truncates long text previews", async () => {
    tokens.tokens = [makeToken("user-b")];
    const uc = makeUseCase({
      identityRead,
      tokens,
      presence,
      conversationState,
      history,
      queue,
    });

    const longText = "a".repeat(120);
    await uc.execute(makeTextEvent({ messageBody: longText }));

    expect(history.rows[0]!.body).toBe(`${"a".repeat(100)}…`);
  });
});
