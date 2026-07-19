import "reflect-metadata";

import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { MESSAGE_EVENT_PUBLISHER } from "../domain/ports/MessageEventPublisher";

import { EventEmitterMessageEventPublisher } from "./EventEmitterMessageEventPublisher";

describe("EventEmitterMessageEventPublisher", () => {
  it("resolves EventEmitter2 and publishes through Nest dependency injection", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        {
          provide: MESSAGE_EVENT_PUBLISHER,
          useClass: EventEmitterMessageEventPublisher,
        },
      ],
    }).compile();

    const publisher = moduleRef.get<EventEmitterMessageEventPublisher>(
      MESSAGE_EVENT_PUBLISHER,
    );
    const emitter = moduleRef.get(EventEmitter2);
    const listener = vi.fn();
    emitter.on("MessageSent", listener);

    await publisher.emitMessageSent({
      event: "MessageSent",
      conversationId: "conversation-1",
      messageId: "message-1",
      senderId: "sender-1",
      recipientId: "recipient-1",
      sentAt: "2026-07-18T00:00:00.000Z",
      messageKind: "text",
      messageBody: "Hello",
      messageMetadata: null,
      messageDeletedAt: null,
    });

    expect(listener).toHaveBeenCalledOnce();

    await moduleRef.close();
  });
});
