import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../api/queryKeys";

import { getSharedConversationSocket } from "./ConversationSocket";
import { handleMessageNew } from "./conversationCacheSync";

/**
 * The app-wide chat listener, mounted once while a User is signed in. The
 * server emits `message:new` to the recipient's user room, so this hook
 * receives a new Message on any screen and refreshes the Messages list, the
 * tab badge count and the by-ID Conversation. When that Conversation is open,
 * its own screen listener runs the same shared handler; the cache patch
 * dedupes by Message id and client message id. A reconnect invalidates the
 * list and counts so Messages missed while offline reconcile over HTTP. The
 * hook owns the shared socket's lifecycle: it connects on mount and
 * disconnects on unmount, so signing out drops the authenticated connection.
 */
export function useGlobalConversationSocket(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSharedConversationSocket();

    const unsubscribeMessage = socket.subscribeMessage((event) => {
      handleMessageNew(queryClient, event);
    });

    let previousStatus = socket.getStatus();
    const unsubscribeStatus = socket.subscribeStatus((next) => {
      // A failed reconnection attempt surfaces as "error" (connect_error), so
      // recovery can arrive as error → connected as well as disconnected →
      // connected. The first connect (idle/connecting → connected) is not a
      // recovery: nothing could have been missed yet.
      if (
        (previousStatus === "disconnected" || previousStatus === "error") &&
        next === "connected"
      ) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.list(),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.unreadCounts(),
        });
      }
      previousStatus = next;
    });

    // connect() is a no-op when the authenticated shared socket is connected.
    void socket.connect();

    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
      socket.disconnect();
    };
  }, [queryClient]);
}
