import { describe, it, expect, vi, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";

import type { MessageSentEvent } from "../../conversations/domain/ports/MessageEventPublisher";
import { DecideDirectMessageNotification } from "./DecideDirectMessageNotification";
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

  it("resolves the decision use-case through Nest dependency injection", async () => {
    const decideNotification = { execute: vi.fn().mockResolvedValue({ enqueued: true }) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessageSentEventHandler,
        { provide: DecideDirectMessageNotification, useValue: decideNotification },
      ],
    }).compile();
    const event = makeEvent();

    await moduleRef.get(MessageSentEventHandler).handleMessageSent(event);

    expect(decideNotification.execute).toHaveBeenCalledWith(event);
    await moduleRef.close();
  });
});
