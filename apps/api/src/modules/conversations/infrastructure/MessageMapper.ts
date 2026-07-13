import { Message } from "../domain/Message";
import type { MessageKind, MessageMetadata } from "../domain/types";

type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  body: string | null;
  metadata: unknown;
  createdAt: Date;
  deletedAt: Date | null;
  clientMessageId: string | null;
};

export function toDomainMessage(row: MessageRow): Message {
  const metadata = parseMetadata(row.metadata);
  const message = Message.fromExisting({
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    kind: row.kind,
    body: row.body,
    metadata,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt,
    clientMessageId: row.clientMessageId,
  });
  return message.isDeleted() ? message.redacted() : message;
}

export function toRawMetadata(
  metadata: MessageMetadata | null,
): unknown | undefined {
  return metadata ?? undefined;
}

function parseMetadata(value: unknown): MessageMetadata | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  return value as MessageMetadata;
}
