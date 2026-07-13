import { describe, it, expect, vi, beforeEach } from "vitest";

import type { MessageSentEvent } from "../../conversations/domain/ports/MessageEventPublisher";
import type { DecideDirectMessageNotification } from "./DecideDirectMessageNotification";
import { MessageSentEventHandler } from "./MessageSentEventHandler";

function makeHandler(
  result: Awaited<ReturnType<DecideDirectMessageNotification["execute"]>>,
) {
  const decideNotification = {
    execute: vi.fn().mockResolvedValue(result),
  } as unknown as DecideDirectMessageNotification;

  return { handler: new MessageSentEventHandler(decideNotification), decideNotification };
}

function makeEvent(overrides?: Partial<MessageSentEvent>): MessageSentEvent {
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

describe("MessageSentEventHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates a valid MessageSent event to the decision use-case", async () => {
    const { handler, decideNotification } = makeHandler({ enqueued: true });
    const event = makeEvent();

    await handler.handleMessageSent(event);

    expect(decideNotification.execute).toHaveBeenCalledWith(event);
  });

  it("delegates events with missing recipient", async () => {
    const { handler, decideNotification } = makeHandler({ enqueued: false });
    const event = makeEvent({ recipientId: "" });

    await handler.handleMessageSent(event);

    expect(decideNotification.execute).toHaveBeenCalledWith(event);
  });
});
