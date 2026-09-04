import { describe, expect, it, vi } from "vitest";

import { Message } from "../domain/Message";

import type { SendConversationMessage } from "./SendConversationMessage";
import { SendRealtimeMessage } from "./SendRealtimeMessage";

describe("SendRealtimeMessage", () => {
  it("returns whether the writer created the message", async () => {
    const message = Message.createText({
      id: "message-1",
      conversationId: "conversation-1",
      senderId: "buyer-1",
      clientMessageId: "client-1",
      text: "Hello",
    });
    const sender = {
      execute: vi.fn().mockResolvedValue({
        message,
        listing: null,
        created: false,
      }),
    } as unknown as SendConversationMessage;
    const useCase = new SendRealtimeMessage(sender);

    const result = await useCase.execute({
      senderId: "buyer-1",
      conversationId: "conversation-1",
      kind: "text",
      text: "Hello",
      clientMessageId: "client-1",
    });

    expect(result).toEqual({ message, created: false });
  });
});
