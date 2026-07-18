import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import type { MessageSentEvent } from "../../conversations/domain/ports/MessageEventPublisher";
import { DecideDirectMessageNotification } from "./DecideDirectMessageNotification";

@Injectable()
export class MessageSentEventHandler {
  constructor(
    @Inject(DecideDirectMessageNotification)
    private readonly decideNotification: DecideDirectMessageNotification,
  ) {}

  @OnEvent("MessageSent")
  async handleMessageSent(event: MessageSentEvent): Promise<void> {
    await this.decideNotification.execute(event);
  }
}
