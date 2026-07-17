import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { parseDirectMessageConversationId } from "./deepLinks";

function routeFromResponse(
  response: Notifications.NotificationResponse,
  lastHandledIdentifier: { current: string | null },
): void {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return;
  }

  const conversationId = parseDirectMessageConversationId(
    response.notification.request.content.data,
  );
  if (!conversationId) {
    return;
  }

  const identifier = response.notification.request.identifier;
  if (lastHandledIdentifier.current === identifier) {
    return;
  }
  lastHandledIdentifier.current = identifier;

  router.push({
    pathname: "/conversations/[id]",
    params: { id: conversationId },
  });
}

/**
 * Routes direct-message push notification taps to the conversation thread.
 *
 * Covers all three entry paths the app shell can observe:
 * - cold start (`getLastNotificationResponse`, cleared after handling),
 * - background tap, and
 * - foreground tap (`addNotificationResponseReceivedListener`).
 *
 * Notifications without a direct-message payload are ignored so future
 * notification categories keep their own routing. Wire once in the root
 * layout; conversation screens consume normal navigation params afterwards.
 */
export function useDirectMessagePushRouting(): void {
  const lastHandledIdentifier = useRef<string | null>(null);

  useEffect(() => {
    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) {
      routeFromResponse(initialResponse, lastHandledIdentifier);
      // Do not re-route the same cold-start response on the next launch.
      Notifications.clearLastNotificationResponse();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => routeFromResponse(response, lastHandledIdentifier),
    );

    return () => subscription.remove();
  }, []);
}
