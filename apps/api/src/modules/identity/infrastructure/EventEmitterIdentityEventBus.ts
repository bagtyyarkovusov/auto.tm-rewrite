import { Inject, Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class EventEmitterIdentityEventBus {
  constructor(
    @Optional()
    @Inject(EventEmitter2)
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  emit(event: string, payload: unknown): void {
    this.eventEmitter?.emit(event, payload);
  }
}
