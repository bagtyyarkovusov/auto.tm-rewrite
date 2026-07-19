const MEDIA_URL = (
  process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""
).replace(/\/$/, "");
const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";

export function buildChatImageUrl(key: string): string {
  if (!MEDIA_URL) return "";
  // Keys coming from presign already include the bucket prefix
  // ("chat-attachments/..."); prepend only for keys that omit it, mirroring
  // MinioMediaStorageAdapter.resolvePublicUrl on the API side.
  const path = key.startsWith(`${CHAT_ATTACHMENTS_BUCKET}/`)
    ? key
    : `${CHAT_ATTACHMENTS_BUCKET}/${key}`;
  return `${MEDIA_URL}/${path}`;
}
