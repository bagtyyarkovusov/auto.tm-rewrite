const MEDIA_URL = (
  process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""
).replace(/\/$/, "");
const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";

export function buildChatImageUrl(key: string): string {
  if (!MEDIA_URL) return "";
  return `${MEDIA_URL}/${CHAT_ATTACHMENTS_BUCKET}/${key}`;
}
