import { describe, it, expect } from "vitest";
import { Message } from "../domain/Message";
import { toDomainMessage } from "./MessageMapper";

describe("MessageMapper", () => {
  it("maps a text message row to domain", () => {
    const message = toDomainMessage({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "sender-1",
      kind: "text",
      body: "Hello",
      metadata: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      deletedAt: null,
      clientMessageId: "client-1",
    });

    expect(message.kind).toBe("text");
    expect(message.body).toBe("Hello");
    expect(message.clientMessageId).toBe("client-1");
    expect(message.isDeleted()).toBe(false);
  });

  it("redacts a deleted message", () => {
    const message = toDomainMessage({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "sender-1",
      kind: "text",
      body: "Hello",
      metadata: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      deletedAt: new Date("2026-01-01T00:01:00Z"),
      clientMessageId: null,
    });

    expect(message.isDeleted()).toBe(true);
    expect(message.body).toBeNull();
    expect(message.metadata).toBeNull();
  });

  it("maps an image message with metadata", () => {
    const message = toDomainMessage({
      id: "msg-img",
      conversationId: "conv-1",
      senderId: "sender-1",
      kind: "image",
      body: null,
      metadata: { key: "chat/image.jpg", width: 800, height: 600 },
      createdAt: new Date("2026-01-01T00:00:00Z"),
      deletedAt: null,
      clientMessageId: null,
    });

    expect(message.kind).toBe("image");
    expect(message.metadata).toEqual({
      key: "chat/image.jpg",
      width: 800,
      height: 600,
    });
  });

  it("maps a post_ref message with listingId", () => {
    const message = toDomainMessage({
      id: "msg-ref",
      conversationId: "conv-1",
      senderId: "sender-1",
      kind: "post_ref",
      body: null,
      metadata: { listingId: "listing-2" },
      createdAt: new Date("2026-01-01T00:00:00Z"),
      deletedAt: null,
      clientMessageId: null,
    });

    expect(message.kind).toBe("post_ref");
    expect(message.metadata).toEqual({ listingId: "listing-2" });
  });
});
