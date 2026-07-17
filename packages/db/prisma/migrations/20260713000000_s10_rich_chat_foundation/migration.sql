-- S10 rich-chat schema foundation: watermarks, mute, soft-delete, idempotency, push-token metadata, message-report context

-- Conversation-level sort/preview anchors
ALTER TABLE "conversations"
    ADD COLUMN "lastMessageAt" TIMESTAMP(3),
    ADD COLUMN "lastMessageId" TEXT;

CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- Participant watermarks + per-conversation mute
ALTER TABLE "conversation_participants"
    ADD COLUMN "mutedAt" TIMESTAMP(3),
    ADD COLUMN "lastReadAt" TIMESTAMP(3),
    ADD COLUMN "lastDeliveredAt" TIMESTAMP(3);

CREATE INDEX "conversation_participants_userId_lastReadAt_idx" ON "conversation_participants"("userId", "lastReadAt");
CREATE INDEX "conversation_participants_userId_lastDeliveredAt_idx" ON "conversation_participants"("userId", "lastDeliveredAt");

-- Message soft-delete + client idempotency key
ALTER TABLE "messages"
    ADD COLUMN "deletedAt" TIMESTAMP(3),
    ADD COLUMN "clientMessageId" TEXT;

CREATE UNIQUE INDEX "messages_conversationId_senderId_clientMessageId_key" ON "messages"("conversationId", "senderId", "clientMessageId");

-- Native push-token registration metadata (FCM/APNS tokens from expo-notifications)
ALTER TABLE "fcm_devices"
    ADD COLUMN "deviceId" TEXT,
    ADD COLUMN "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "invalidatedAt" TIMESTAMP(3);

CREATE INDEX "fcm_devices_userId_invalidatedAt_idx" ON "fcm_devices"("userId", "invalidatedAt");

-- Message-report surrounding context for admin review
ALTER TABLE "content_reports"
    ADD COLUMN "messageContext" JSONB;
