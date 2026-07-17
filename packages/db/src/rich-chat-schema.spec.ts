import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../prisma/schema.prisma");
const migrationPath = resolve(
  __dirname,
  "../prisma/migrations/20260713000000_s10_rich_chat_foundation/migration.sql",
);

const schema = readFileSync(schemaPath, "utf-8");
const migration = readFileSync(migrationPath, "utf-8");

function extractModel(source: string, modelName: string): string {
  const start = source.indexOf(`model ${modelName} {`);
  if (start === -1) return "";
  const end = source.indexOf("}", start);
  return source.slice(start, end + 1);
}

describe("S10 rich-chat schema additions", () => {
  it("adds conversation last-message fields", () => {
    const model = extractModel(schema, "Conversation");
    expect(model).toContain("lastMessageAt");
    expect(model).toContain("lastMessageId");
    expect(model).toContain('@@index([lastMessageAt])');
  });

  it("adds participant watermark and mute fields", () => {
    const model = extractModel(schema, "ConversationParticipant");
    expect(model).toContain("mutedAt");
    expect(model).toContain("lastReadAt");
    expect(model).toContain("lastDeliveredAt");
    expect(model).toContain('@@index([userId, lastReadAt])');
    expect(model).toContain('@@index([userId, lastDeliveredAt])');
  });

  it("adds message soft-delete and idempotency fields", () => {
    const model = extractModel(schema, "Message");
    expect(model).toContain("deletedAt");
    expect(model).toContain("clientMessageId");
    expect(model).toContain(
      '@@unique([conversationId, senderId, clientMessageId])',
    );
  });

  it("extends FcmDevice with native push-token metadata", () => {
    const model = extractModel(schema, "FcmDevice");
    expect(model).toContain("deviceId");
    expect(model).toContain("registeredAt");
    expect(model).toContain("lastUsedAt");
    expect(model).toContain("invalidatedAt");
    expect(model).toContain('@@index([userId, invalidatedAt])');
  });

  it("adds message context to ContentReport", () => {
    const model = extractModel(schema, "ContentReport");
    expect(model).toContain("messageContext");
  });
});

describe("S10 rich-chat migration SQL", () => {
  it("creates conversation last-message columns", () => {
    expect(migration).toContain('"lastMessageAt" TIMESTAMP(3)');
    expect(migration).toContain('"lastMessageId" TEXT');
    expect(migration).toContain(
      'CREATE INDEX "conversations_lastMessageAt_idx"',
    );
  });

  it("creates participant watermark/mute columns", () => {
    expect(migration).toContain('"mutedAt" TIMESTAMP(3)');
    expect(migration).toContain('"lastReadAt" TIMESTAMP(3)');
    expect(migration).toContain('"lastDeliveredAt" TIMESTAMP(3)');
    expect(migration).toContain(
      'CREATE INDEX "conversation_participants_userId_lastReadAt_idx"',
    );
    expect(migration).toContain(
      'CREATE INDEX "conversation_participants_userId_lastDeliveredAt_idx"',
    );
  });

  it("creates message soft-delete and idempotency columns", () => {
    expect(migration).toContain('"deletedAt" TIMESTAMP(3)');
    expect(migration).toContain('"clientMessageId" TEXT');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "messages_conversationId_senderId_clientMessageId_key"',
    );
  });

  it("creates push-token metadata columns", () => {
    expect(migration).toContain('"deviceId" TEXT');
    expect(migration).toContain('"registeredAt" TIMESTAMP(3) NOT NULL');
    expect(migration).toContain('"lastUsedAt" TIMESTAMP(3) NOT NULL');
    expect(migration).toContain('"invalidatedAt" TIMESTAMP(3)');
    expect(migration).toContain(
      'CREATE INDEX "fcm_devices_userId_invalidatedAt_idx"',
    );
  });

  it("creates message-report context column", () => {
    expect(migration).toContain('"messageContext" JSONB');
  });
});
