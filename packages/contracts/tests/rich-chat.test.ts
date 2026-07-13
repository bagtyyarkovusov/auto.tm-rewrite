import { describe, it, expect } from "vitest";

import {
  MessageKind,
  PushPlatform,
  NotificationCategory,
} from "../src/enums";
import {
  MessageKindSchema,
  ImageMessageMetadataSchema,
  PostRefMessageMetadataSchema,
  MessageSummarySchema,
  SendMessageRequestSchema,
  UpdateWatermarkRequestSchema,
  MuteConversationRequestSchema,
  DeleteMessageResponseSchema,
  ChatMessageEventSchema,
  MessageDeletedEventSchema,
  TypingEventSchema,
  WatermarkEventSchema,
} from "../src/schemas/conversations";
import {
  RegisterPushTokenRequestSchema,
  RegisterPushTokenResponseSchema,
  UpdateNotificationPreferencesRequestSchema,
} from "../src/schemas/notifications";
import {
  ReportTargetType,
  CreateMessageReportRequestSchema,
  MessageReportContextSchema,
  ReportDetailTargetSchema,
} from "../src/schemas/admin";
import { generateOpenApiDocument } from "../src/openapi";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const iso = "2026-07-13T10:00:00Z";

describe("MessageKindSchema", () => {
  it("accepts all known kinds", () => {
    expect(MessageKindSchema.safeParse(MessageKind.Text).success).toBe(true);
    expect(MessageKindSchema.safeParse(MessageKind.Image).success).toBe(true);
    expect(MessageKindSchema.safeParse(MessageKind.PostRef).success).toBe(true);
    expect(MessageKindSchema.safeParse(MessageKind.System).success).toBe(true);
  });

  it("rejects unknown kind", () => {
    expect(MessageKindSchema.safeParse("video").success).toBe(false);
  });
});

describe("ImageMessageMetadataSchema", () => {
  it("accepts a valid image metadata payload", () => {
    const result = ImageMessageMetadataSchema.safeParse({
      key: "chat-attachments/uuid/image.jpg",
      width: 1200,
      height: 900,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative dimensions", () => {
    const result = ImageMessageMetadataSchema.safeParse({
      key: "chat-attachments/uuid/image.jpg",
      width: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("PostRefMessageMetadataSchema", () => {
  it("accepts a valid listing reference snapshot", () => {
    const result = PostRefMessageMetadataSchema.safeParse({
      listingId: validUuid,
      brandId: validUuid,
      modelId: validUuid,
      year: 2021,
      displayPriceTmt: 200000,
      priceCurrency: "TMT",
      coverMediaKey: "cover.jpg",
      status: "active",
      available: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a listing reference missing required snapshot fields", () => {
    const result = PostRefMessageMetadataSchema.safeParse({
      listingId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid listing id", () => {
    const result = PostRefMessageMetadataSchema.safeParse({
      listingId: "not-a-uuid",
      brandId: validUuid,
      modelId: validUuid,
      displayPriceTmt: 200000,
      priceCurrency: "TMT",
      status: "active",
    });
    expect(result.success).toBe(false);
  });
});

describe("MessageSummarySchema", () => {
  it("accepts a legacy text message", () => {
    const result = MessageSummarySchema.safeParse({
      id: validUuid,
      conversationId: validUuid,
      senderId: validUuid,
      text: "Hello",
      createdAt: iso,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe(MessageKind.Text);
    }
  });

  it("accepts an image message", () => {
    const result = MessageSummarySchema.safeParse({
      id: validUuid,
      conversationId: validUuid,
      senderId: validUuid,
      kind: MessageKind.Image,
      text: "",
      metadata: { key: "chat-attachments/uuid/image.jpg" },
      createdAt: iso,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a post_ref message", () => {
    const result = MessageSummarySchema.safeParse({
      id: validUuid,
      conversationId: validUuid,
      senderId: validUuid,
      kind: MessageKind.PostRef,
      text: "",
      metadata: {
        listingId: validUuid,
        brandId: validUuid,
        modelId: validUuid,
        displayPriceTmt: 200000,
        priceCurrency: "TMT",
        status: "active",
        available: false,
      },
      createdAt: iso,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a soft-deleted message", () => {
    const result = MessageSummarySchema.safeParse({
      id: validUuid,
      conversationId: validUuid,
      senderId: validUuid,
      kind: MessageKind.Text,
      text: "",
      createdAt: iso,
      deletedAt: iso,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid deletedAt datetime", () => {
    const result = MessageSummarySchema.safeParse({
      id: validUuid,
      conversationId: validUuid,
      senderId: validUuid,
      text: "Hello",
      createdAt: iso,
      deletedAt: "not-a-datetime",
    });
    expect(result.success).toBe(false);
  });
});

describe("SendMessageRequestSchema", () => {
  it("accepts a text send request", () => {
    const result = SendMessageRequestSchema.safeParse({
      kind: MessageKind.Text,
      text: "Hello",
      clientMessageId: "client-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an image send request", () => {
    const result = SendMessageRequestSchema.safeParse({
      kind: MessageKind.Image,
      metadata: { key: "chat-attachments/uuid/image.jpg" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a post_ref send request through the generic rich route", () => {
    const result = SendMessageRequestSchema.safeParse({
      kind: MessageKind.PostRef,
      metadata: { listingId: validUuid },
    });
    expect(result.success).toBe(false);
  });

  it("rejects text send without text", () => {
    const result = SendMessageRequestSchema.safeParse({
      kind: MessageKind.Text,
    });
    expect(result.success).toBe(false);
  });

  it("rejects image send without metadata", () => {
    const result = SendMessageRequestSchema.safeParse({
      kind: MessageKind.Image,
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateWatermarkRequestSchema", () => {
  it("accepts lastReadAt update", () => {
    const result = UpdateWatermarkRequestSchema.safeParse({ lastReadAt: iso });
    expect(result.success).toBe(true);
  });

  it("accepts lastDeliveredAt update", () => {
    const result = UpdateWatermarkRequestSchema.safeParse({
      lastDeliveredAt: iso,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty watermark update", () => {
    const result = UpdateWatermarkRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("MuteConversationRequestSchema", () => {
  it("accepts mute", () => {
    const result = MuteConversationRequestSchema.safeParse({ muted: true });
    expect(result.success).toBe(true);
  });

  it("accepts unmute", () => {
    const result = MuteConversationRequestSchema.safeParse({ muted: false });
    expect(result.success).toBe(true);
  });
});

describe("DeleteMessageResponseSchema", () => {
  it("accepts a valid soft-delete response", () => {
    const result = DeleteMessageResponseSchema.safeParse({
      messageId: validUuid,
      deletedAt: iso,
    });
    expect(result.success).toBe(true);
  });
});

describe("Socket event schemas", () => {
  it("accepts chat message event", () => {
    const result = ChatMessageEventSchema.safeParse({
      message: {
        id: validUuid,
        conversationId: validUuid,
        senderId: validUuid,
        text: "Hello",
        createdAt: iso,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects chat message event without text", () => {
    const result = ChatMessageEventSchema.safeParse({
      message: {
        id: validUuid,
        conversationId: validUuid,
        senderId: validUuid,
        kind: MessageKind.Image,
        metadata: { key: "chat-attachments/uuid/image.jpg" },
        createdAt: iso,
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts message deleted event", () => {
    const result = MessageDeletedEventSchema.safeParse({
      messageId: validUuid,
      conversationId: validUuid,
      deletedAt: iso,
    });
    expect(result.success).toBe(true);
  });

  it("accepts typing event", () => {
    const result = TypingEventSchema.safeParse({
      conversationId: validUuid,
      userId: validUuid,
      isTyping: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts watermark event", () => {
    const result = WatermarkEventSchema.safeParse({
      conversationId: validUuid,
      userId: validUuid,
      lastReadAt: iso,
    });
    expect(result.success).toBe(true);
  });
});

describe("Push-token schemas", () => {
  it("accepts a valid native token registration", () => {
    const result = RegisterPushTokenRequestSchema.safeParse({
      token: "fcm-native-token",
      platform: PushPlatform.Android,
      deviceId: "device-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty token", () => {
    const result = RegisterPushTokenRequestSchema.safeParse({
      token: "",
      platform: PushPlatform.Ios,
    });
    expect(result.success).toBe(false);
  });

  it("accepts registration response", () => {
    const result = RegisterPushTokenResponseSchema.safeParse({
      registered: true,
      invalidatedPrevious: false,
      token: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        token: "fcm-native-token",
        platform: PushPlatform.Android,
        deviceId: "device-1",
        createdAt: "2026-07-13T00:00:00.000Z",
        lastSeenAt: "2026-07-13T00:00:00.000Z",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("Notification preference schemas", () => {
  it("accepts per-category opt-outs", () => {
    const result = UpdateNotificationPreferencesRequestSchema.safeParse({
      optOuts: {
        [NotificationCategory.ListingActivity]: "digest",
        [NotificationCategory.Marketing]: "none",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid opt-out value", () => {
    const result = UpdateNotificationPreferencesRequestSchema.safeParse({
      optOuts: {
        [NotificationCategory.DirectMessages]: "bad_value",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("Message-report schemas", () => {
  it("accepts a message report creation request", () => {
    const result = CreateMessageReportRequestSchema.safeParse({
      reason: "harassment",
      messageId: validUuid,
      conversationId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("requires details when reason is other", () => {
    const result = CreateMessageReportRequestSchema.safeParse({
      reason: "other",
      messageId: validUuid,
      conversationId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("accepts message report context", () => {
    const result = MessageReportContextSchema.safeParse({
      conversationId: validUuid,
      messageId: validUuid,
      senderId: validUuid,
      messageCreatedAt: iso,
      messageBody: "Offensive text",
      surroundingMessageIds: [validUuid],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a message target in report detail", () => {
    const result = ReportDetailTargetSchema.safeParse({
      targetType: ReportTargetType.Message,
      available: true,
      label: "Reported message",
      targetId: validUuid,
      conversationId: validUuid,
      senderId: validUuid,
      messageCreatedAt: iso,
    });
    expect(result.success).toBe(true);
  });
});

describe("OpenAPI document — S10 rich-chat schemas", () => {
  it("contains rich-chat request/response schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("SendMessageRequest");
    expect(doc.components.schemas).toHaveProperty("SendMessageResponse");
    expect(doc.components.schemas).toHaveProperty("SendPostRefMessageRequest");
    expect(doc.components.schemas).toHaveProperty("ImageMessageMetadata");
    expect(doc.components.schemas).toHaveProperty("PostRefMessageMetadata");
    expect(doc.components.schemas).toHaveProperty("UpdateWatermarkRequest");
    expect(doc.components.schemas).toHaveProperty("UpdateWatermarkResponse");
    expect(doc.components.schemas).toHaveProperty("MuteConversationRequest");
    expect(doc.components.schemas).toHaveProperty("MuteConversationResponse");
    expect(doc.components.schemas).toHaveProperty("DeleteMessageResponse");
    expect(doc.components.schemas).toHaveProperty("ChatMessageEvent");
    expect(doc.components.schemas).toHaveProperty("MessageDeletedEvent");
    expect(doc.components.schemas).toHaveProperty("TypingEvent");
    expect(doc.components.schemas).toHaveProperty("WatermarkEvent");
  });

  it("contains push-token and notification preference schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("RegisterPushTokenRequest");
    expect(doc.components.schemas).toHaveProperty("RegisterPushTokenResponse");
    expect(doc.components.schemas).toHaveProperty("NotificationPreferences");
    expect(doc.components.schemas).toHaveProperty(
      "UpdateNotificationPreferencesRequest",
    );
    expect(doc.components.schemas).toHaveProperty(
      "UpdateNotificationPreferencesResponse",
    );
  });

  it("contains message-report schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("CreateMessageReportRequest");
    expect(doc.components.schemas).toHaveProperty("MessageReportContext");
  });
});
