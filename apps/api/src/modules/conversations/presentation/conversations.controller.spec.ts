import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { ConversationsController } from "./conversations.controller";
import type { OpenConversation } from "../application/OpenConversation";
import type { ListMyConversations } from "../application/ListMyConversations";
import type { ListMessages } from "../application/ListMessages";
import type { SendTextMessage } from "../application/SendTextMessage";
import type { SendMessage } from "../application/SendMessage";
import type { SendPostRefMessage } from "../application/SendPostRefMessage";
import type { PresignChatAttachmentUpload } from "../application/PresignChatAttachmentUpload";
import type { UpdateWatermark } from "../application/UpdateWatermark";
import type { MuteConversation } from "../application/MuteConversation";
import type { DeleteMessage } from "../application/DeleteMessage";
import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import { Message } from "../domain/Message";
import { Conversation } from "../domain/Conversation";

function buildController(overrides: {
  openConversation?: OpenConversation;
  listMyConversations?: ListMyConversations;
  listMessages?: ListMessages;
  sendTextMessage?: SendTextMessage;
  sendMessage?: SendMessage;
  sendPostRefMessage?: SendPostRefMessage;
  presignChatAttachmentUpload?: PresignChatAttachmentUpload;
  updateWatermark?: UpdateWatermark;
  muteConversation?: MuteConversation;
  deleteMessage?: DeleteMessage;
  listings?: ListingsReadPort;
} = {}) {
  return new ConversationsController(
    overrides.openConversation ?? ({} as OpenConversation),
    overrides.listMyConversations ?? ({} as ListMyConversations),
    overrides.listMessages ?? ({} as ListMessages),
    overrides.sendTextMessage ?? ({} as SendTextMessage),
    overrides.sendMessage ?? ({} as SendMessage),
    overrides.sendPostRefMessage ?? ({} as SendPostRefMessage),
    overrides.presignChatAttachmentUpload ?? ({} as PresignChatAttachmentUpload),
    overrides.updateWatermark ?? ({} as UpdateWatermark),
    overrides.muteConversation ?? ({} as MuteConversation),
    overrides.deleteMessage ?? ({} as DeleteMessage),
    overrides.listings ?? ({ getListingSummaries: vi.fn().mockResolvedValue([]) } as unknown as ListingsReadPort),
  );
}

function authReq(userId: string): { user: { sub: string } } {
  return { user: { sub: userId } } as { user: { sub: string } };
}

describe("ConversationsController rich message routes", () => {
  it("sends a rich text message", async () => {
    const message = Message.createText({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "buyer-1",
      text: "Hello",
      clientMessageId: "client-1",
    });
    const sendMessage = {
      execute: vi.fn().mockResolvedValue({ message, listing: null }),
    } as unknown as SendMessage;
    const controller = buildController({ sendMessage });

    const result = await controller.sendMessage(
      "conv-1",
      { kind: "text", text: "Hello", clientMessageId: "client-1" },
      authReq("buyer-1") as never,
    );

    expect(result.kind).toBe("text");
    expect(result.text).toBe("Hello");
    expect(result.clientMessageId).toBe("client-1");
    expect(sendMessage.execute).toHaveBeenCalledWith({
      senderId: "buyer-1",
      conversationId: "conv-1",
      kind: "text",
      text: "Hello",
      clientMessageId: "client-1",
    });
  });

  it("sends an image message", async () => {
    const message = Message.createImage({
      id: "msg-img",
      conversationId: "conv-1",
      senderId: "buyer-1",
      metadata: { key: "chat/image.jpg" },
    });
    const sendMessage = {
      execute: vi.fn().mockResolvedValue({ message, listing: null }),
    } as unknown as SendMessage;
    const controller = buildController({ sendMessage });

    const result = await controller.sendMessage(
      "conv-1",
      { kind: "image", metadata: { key: "chat/image.jpg" } },
      authReq("buyer-1") as never,
    );

    expect(result.kind).toBe("image");
    expect(result.metadata).toEqual({ key: "chat/image.jpg" });
  });

  it("sends a post_ref message", async () => {
    const listingId = "550e8400-e29b-41d4-a716-446655440002";
    const message = Message.createPostRef({
      id: "msg-ref",
      conversationId: "conv-1",
      senderId: "buyer-1",
      metadata: {
        listingId,
        brandId: "brand-1",
        modelId: "model-1",
        year: 2021,
        displayPriceTmt: 200000,
        priceCurrency: "TMT",
        coverMediaKey: "cover.jpg",
        status: "active",
      },
    });
    const sendPostRefMessage = {
      execute: vi.fn().mockResolvedValue({ message, listing: null }),
    } as unknown as SendPostRefMessage;
    const listings = {
      getListingSummaries: vi.fn().mockResolvedValue([
        {
          id: listingId,
          sellerId: "seller-2",
          status: "active",
          brandId: "brand-1",
          modelId: "model-1",
          year: 2021,
          priceAmount: 200000,
          priceCurrency: "TMT",
          displayPriceTmt: 200000,
          coverMediaKey: "cover.jpg",
          cityId: "city-2",
          publishedAt: new Date("2026-05-01T00:00:00Z"),
          allowChat: true,
        },
      ]),
    } as unknown as ListingsReadPort;
    const controller = buildController({ sendPostRefMessage, listings });

    const result = await controller.sendPostRefMessage(
      "conv-1",
      { metadata: { listingId } },
      authReq("buyer-1") as never,
    );

    expect(result.kind).toBe("post_ref");
    expect(result.metadata).toMatchObject({ listingId, available: true });
    expect(sendPostRefMessage.execute).toHaveBeenCalledWith({
      senderId: "buyer-1",
      conversationId: "conv-1",
      metadata: { listingId },
      clientMessageId: undefined,
    });
  });

  it("marks a post_ref card unavailable when the referenced listing is no longer active", async () => {
    const listingId = "550e8400-e29b-41d4-a716-446655440002";
    const message = Message.createPostRef({
      id: "msg-ref",
      conversationId: "conv-1",
      senderId: "buyer-1",
      metadata: {
        listingId,
        brandId: "brand-1",
        modelId: "model-1",
        year: 2021,
        displayPriceTmt: 200000,
        priceCurrency: "TMT",
        coverMediaKey: "cover.jpg",
        status: "active",
      },
    });
    const listMessages = {
      execute: vi.fn().mockResolvedValue({ items: [message], nextCursor: null }),
    } as unknown as ListMessages;
    const listings = {
      getListingSummaries: vi.fn().mockResolvedValue([
        {
          id: listingId,
          sellerId: "seller-2",
          status: "sold",
          brandId: "brand-1",
          modelId: "model-1",
          year: 2021,
          priceAmount: 200000,
          priceCurrency: "TMT",
          displayPriceTmt: 200000,
          coverMediaKey: "cover.jpg",
          cityId: "city-2",
          publishedAt: new Date("2026-05-01T00:00:00Z"),
          allowChat: true,
        },
      ]),
    } as unknown as ListingsReadPort;
    const controller = buildController({ listMessages, listings });

    const result = await controller.listMessages(
      "conv-1",
      {},
      authReq("buyer-1") as never,
    );

    expect(result.items[0]!.metadata).toMatchObject({
      listingId,
      status: "active",
      available: false,
    });
  });

  it("rejects an invalid rich message payload", async () => {
    const controller = buildController();

    await expect(
      controller.sendMessage(
        "conv-1",
        { kind: "text" },
        authReq("buyer-1") as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("presigns a chat attachment upload", async () => {
    const presignChatAttachmentUpload = {
      execute: vi.fn().mockResolvedValue({
        uploadUrl: "https://media.auto.tm/presigned/chat-attachments/conv-1/uuid/original.jpg",
        key: "chat-attachments/conv-1/uuid/original.jpg",
        expiresIn: 600,
        maxSizeBytes: 5 * 1024 * 1024,
      }),
    } as unknown as PresignChatAttachmentUpload;
    const controller = buildController({ presignChatAttachmentUpload });

    const result = await controller.presignChatAttachment(
      "conv-1",
      { contentType: "image/jpeg", sizeBytes: 1024 },
      authReq("buyer-1") as never,
    );

    expect(result.key).toBe("chat-attachments/conv-1/uuid/original.jpg");
    expect(result.uploadUrl).toContain("presigned");
    expect(presignChatAttachmentUpload.execute).toHaveBeenCalledWith({
      userId: "buyer-1",
      conversationId: "conv-1",
      contentType: "image/jpeg",
      sizeBytes: 1024,
    });
  });
});

describe("ConversationsController watermark/mute/delete routes", () => {
  it("updates a watermark", async () => {
    const updateWatermark = {
      execute: vi.fn().mockResolvedValue({
        conversationId: "conv-1",
        lastReadAt: new Date("2026-01-01T00:00:00Z"),
        lastDeliveredAt: null,
      }),
    } as unknown as UpdateWatermark;
    const controller = buildController({ updateWatermark });

    const result = await controller.updateWatermark(
      "conv-1",
      { lastReadAt: "2026-01-01T00:00:00Z" },
      authReq("buyer-1") as never,
    );

    expect(result.lastReadAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updateWatermark.execute).toHaveBeenCalledWith({
      userId: "buyer-1",
      conversationId: "conv-1",
      lastReadAt: "2026-01-01T00:00:00Z",
    });
  });

  it("mutes a conversation", async () => {
    const muteConversation = {
      execute: vi.fn().mockResolvedValue({
        conversationId: "conv-1",
        mutedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    } as unknown as MuteConversation;
    const controller = buildController({ muteConversation });

    const result = await controller.muteConversation(
      "conv-1",
      { muted: true },
      authReq("buyer-1") as never,
    );

    expect(result.mutedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(muteConversation.execute).toHaveBeenCalledWith({
      userId: "buyer-1",
      conversationId: "conv-1",
      muted: true,
    });
  });

  it("deletes a message", async () => {
    const deleteMessage = {
      execute: vi.fn().mockResolvedValue({
        messageId: "msg-1",
        deletedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    } as unknown as DeleteMessage;
    const controller = buildController({ deleteMessage });

    const result = await controller.deleteMessage(
      "conv-1",
      "msg-1",
      authReq("buyer-1") as never,
    );

    expect(result.messageId).toBe("msg-1");
    expect(deleteMessage.execute).toHaveBeenCalledWith({
      userId: "buyer-1",
      conversationId: "conv-1",
      messageId: "msg-1",
    });
  });
});

describe("ConversationsController auth/participant failures", () => {
  it("rejects send when use-case throws ForbiddenException", async () => {
    const sendMessage = {
      execute: vi.fn().mockRejectedValue(new ForbiddenException("blocked")),
    } as unknown as SendMessage;
    const controller = buildController({ sendMessage });

    await expect(
      controller.sendMessage(
        "conv-1",
        { kind: "text", text: "Hello" },
        authReq("buyer-1") as never,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects watermark when conversation is not found", async () => {
    const updateWatermark = {
      execute: vi.fn().mockRejectedValue(new NotFoundException("missing")),
    } as unknown as UpdateWatermark;
    const controller = buildController({ updateWatermark });

    await expect(
      controller.updateWatermark(
        "missing",
        { lastReadAt: "2026-01-01T00:00:00Z" },
        authReq("buyer-1") as never,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("ConversationsController list conversations", () => {
  it("includes last message and unread count", async () => {
    const conversation = Conversation.create({
      id: "conv-1",
      listingId: "listing-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const lastMessage = Message.createText({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "seller-1",
      text: "Hello",
    });
    const listMyConversations = {
      execute: vi.fn().mockResolvedValue({
        items: [
          {
            conversation,
            listing: null,
            lastMessage,
            unreadCount: 3,
          },
        ],
        nextCursor: null,
      }),
    } as unknown as ListMyConversations;
    const controller = buildController({ listMyConversations });

    const result = await controller.listMyConversations(
      {},
      authReq("buyer-1") as never,
    );

    expect(result.items[0]!.unreadCount).toBe(3);
    expect(result.items[0]!.lastMessage).toBeDefined();
    expect(result.items[0]!.lastMessage!.text).toBe("Hello");
  });
});
