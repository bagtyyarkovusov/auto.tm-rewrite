import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router, usePathname } from "expo-router";

import {
  MESSAGES_HREF,
  conversationHref,
  isConversationPath,
} from "../conversations/conversationRoutes";

import { parseDirectMessageConversationId } from "./deepLinks";

function routeFromResponse(
  response: Notifications.NotificationResponse,
  lastHandledIdentifier: { current: string | null },
  pathname: { current: string },
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

  // Already on screen: a second copy would only add a Back step.
  if (isConversationPath(pathname.current, conversationId)) {
    return;
  }

  // Back from a push-opened Conversation goes to the Messages list (D9).
  // `dismissTo` pops the root Stack to the tabs and selects Messages, or
  // replaces the top screen with them when the tabs are not open yet (cold
  // start); the Conversation is then pushed on top.
  router.dismissTo(MESSAGES_HREF);
  router.push(conversationHref(conversationId));
}

/**
 * Routes direct-message push notification taps to the conversation thread.
 *
 * Covers all three entry paths the app shell can observe:
 * - cold start (`getLastNotificationResponse`, cleared after handling),
 * - background tap, and
 * - foreground tap (`addNotificationResponseReceivedListener`).
 *
 * In each path the Conversation opens over the Messages tab, so Back and the
 * Android back gesture land on the Messages list. A tap for the Conversation
 * already on screen does nothing.
 *
 * Notifications without a direct-message payload are ignored so future
 * notification categories keep their own routing. Wire once in the root
 * layout; the Conversation screen loads everything else by ID.
 */
export function useDirectMessagePushRouting(): void {
  const lastHandledIdentifier = useRef<string | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) {
      routeFromResponse(initialResponse, lastHandledIdentifier, pathnameRef);
      // Do not re-route the same cold-start response on the next launch.
      Notifications.clearLastNotificationResponse();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) =>
        routeFromResponse(response, lastHandledIdentifier, pathnameRef),
    );

    return () => subscription.remove();
  }, []);
}
