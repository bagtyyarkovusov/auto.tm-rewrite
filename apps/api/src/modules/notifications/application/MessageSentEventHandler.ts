import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import type { MessageSentEvent } from "../../conversations/domain/ports/MessageEventPublisher";
import type { DecideDirectMessageNotification } from "./DecideDirectMessageNotification";

@Injectable()
export class MessageSentEventHandler {
  constructor(
    private readonly decideNotification: DecideDirectMessageNotification,
  ) {}

  @OnEvent("MessageSent")
  async handleMessageSent(event: MessageSentEvent): Promise<void> {
    await this.decideNotification.execute(event);
  }
}
