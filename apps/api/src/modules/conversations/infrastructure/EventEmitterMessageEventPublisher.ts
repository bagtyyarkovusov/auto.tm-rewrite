import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import type {
  MessageEventPublisher,
  MessageSentEvent,
} from "../domain/ports/MessageEventPublisher";

@Injectable()
export class EventEmitterMessageEventPublisher
  implements MessageEventPublisher
{
  constructor(
    @Inject(EventEmitter2) private readonly emitter: EventEmitter2,
  ) {}

  async emitMessageSent(event: MessageSentEvent): Promise<void> {
    await this.emitter.emitAsync(event.event, event);
  }
}
