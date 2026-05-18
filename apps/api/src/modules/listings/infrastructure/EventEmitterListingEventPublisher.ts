import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import type {
  ListingEventPayload,
  ListingEventPublisher,
} from "../domain/ports/ListingEventPublisher";

@Injectable()
export class EventEmitterListingEventPublisher
  implements ListingEventPublisher
{
  constructor(private readonly emitter: EventEmitter2) {}

  async emit(payload: ListingEventPayload): Promise<void> {
    this.emitter.emit(payload.event, payload);
  }
}
