import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import type { EvaluateDirectMessagePush } from "./EvaluateDirectMessagePush";

interface MessageSentEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  sentAt: string;
}

@Injectable()
export class MessageSentEventHandler {
  constructor(
    private readonly evaluatePush: EvaluateDirectMessagePush,
  ) {}

  @OnEvent("MessageSent")
  async handleMessageSent(event: MessageSentEvent): Promise<void> {
    if (!event.recipientId || !event.senderId) {
      return;
    }

    const decision = await this.evaluatePush.execute({
      senderId: event.senderId,
      recipientId: event.recipientId,
    });

    if (!decision.shouldSend) {
      // Push is suppressed. The actual transport dispatch lives in #244/#245;
      // this handler owns the suppression decision only.
      return;
    }

    // Eligible for push. Dispatch will be wired once the transport layer lands.
  }
}
