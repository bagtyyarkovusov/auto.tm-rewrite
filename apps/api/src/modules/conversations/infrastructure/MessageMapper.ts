import { Message } from "../domain/Message";
import type {
  ImageMessageMetadata,
  MessageKind,
  MessageMetadata,
  PostRefMessageMetadata,
} from "../domain/types";

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

  if (hasKey(value)) {
    return value as ImageMessageMetadata;
  }

  if (hasListingId(value)) {
    return value as PostRefMessageMetadata;
  }

  return null;
}

function hasKey(value: object): value is { key: string } {
  return "key" in value && typeof value.key === "string" && value.key.length > 0;
}

function hasListingId(value: object): value is { listingId: string } {
  return (
    "listingId" in value &&
    typeof value.listingId === "string" &&
    value.listingId.length > 0
  );
}
