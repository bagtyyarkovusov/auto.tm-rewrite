import { describe, it, expect, vi, beforeEach } from "vitest";

import type { EvaluateDirectMessagePush } from "./EvaluateDirectMessagePush";
import { MessageSentEventHandler } from "./MessageSentEventHandler";

function makeHandler(
  decision: Awaited<ReturnType<EvaluateDirectMessagePush["execute"]>>,
) {
  const evaluatePush = {
    execute: vi.fn().mockResolvedValue(decision),
  } as unknown as EvaluateDirectMessagePush;

  return { handler: new MessageSentEventHandler(evaluatePush), evaluatePush };
}

describe("MessageSentEventHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates push eligibility for a valid MessageSent event", async () => {
    const { handler, evaluatePush } = makeHandler({ shouldSend: true });

    await handler.handleMessageSent({
      conversationId: "conv-1",
      messageId: "msg-1",
      senderId: "user-a",
      recipientId: "user-b",
      sentAt: new Date().toISOString(),
    });

    expect(evaluatePush.execute).toHaveBeenCalledWith({
      senderId: "user-a",
      recipientId: "user-b",
    });
  });

  it("short-circuits when recipient is missing", async () => {
    const { handler, evaluatePush } = makeHandler({ shouldSend: true });

    await handler.handleMessageSent({
      conversationId: "conv-1",
      messageId: "msg-1",
      senderId: "user-a",
      recipientId: "",
      sentAt: new Date().toISOString(),
    });

    expect(evaluatePush.execute).not.toHaveBeenCalled();
  });

  it("short-circuits when sender is missing", async () => {
    const { handler, evaluatePush } = makeHandler({ shouldSend: true });

    await handler.handleMessageSent({
      conversationId: "conv-1",
      messageId: "msg-1",
      senderId: "",
      recipientId: "user-b",
      sentAt: new Date().toISOString(),
    });

    expect(evaluatePush.execute).not.toHaveBeenCalled();
  });
});
