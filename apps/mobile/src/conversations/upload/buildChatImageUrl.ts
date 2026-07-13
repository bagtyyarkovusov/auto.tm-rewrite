const MEDIA_URL = (
  process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""
).replace(/\/$/, "");

export function buildChatImageUrl(key: string): string {
  if (!MEDIA_URL) return "";
  return `${MEDIA_URL}/chat-attachments/${key}`;
}
