import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../api/queryKeys";

/**
 * Refreshes the Messages tab count and the Conversation list when a push
 * arrives while the app is open. Any push refreshes: the requests are small and
 * no other notification category exists yet.
 */
export function useRefreshUnreadOnPush(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.unreadCounts(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.list(),
      });
    });
    return () => subscription.remove();
  }, [queryClient]);
}
