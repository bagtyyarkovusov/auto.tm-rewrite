/**
 * Parses the notification `data` payload of a direct-message push and returns
 * the target conversation id, or `null` when the payload is not a
 * direct-message deep link.
 *
 * Two shapes are supported because the worker push payload carries both:
 * - `data.conversationId` — the raw id from `DirectMessageNotification.data`.
 * - `data.deepLink` — the `/conversations/{id}` deep link string that the
 *   transport layer delivers alongside the notification.
 */
export function parseDirectMessageConversationId(
  data: unknown,
): string | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const record = data as Record<string, unknown>;

  const conversationId = record["conversationId"];
  if (typeof conversationId === "string" && conversationId.length > 0) {
    return conversationId;
  }

  const deepLink = record["deepLink"];
  if (typeof deepLink === "string") {
    const match = /^\/conversations\/([^/?#]+)/.exec(deepLink);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}
