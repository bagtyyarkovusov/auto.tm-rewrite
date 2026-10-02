import { useQuery } from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { useViewer } from "../../auth/useViewer";
import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/**
 * Total unread Messages for the signed-in User, shown on the Messages tab.
 * 0 while signed out or while the session loads. The key carries the viewer, so
 * another User never reads the previous User's count.
 */
export function useUnreadCount(): number {
  const viewerId = useViewer()?.userId ?? null;

  const { data } = useQuery({
    queryKey: queryKeys.conversations.unreadCount(viewerId ?? ""),
    queryFn: () =>
      apiClient.get(
        "/conversations/unread-count",
        ConversationsSchemas.UnreadCountResponseSchema,
      ),
    enabled: viewerId !== null,
    // Always stale, so returning to the foreground refetches it (the root layout
    // connects AppState to focusManager). It is one small request.
    staleTime: 0,
  });

  return viewerId === null ? 0 : (data?.count ?? 0);
}
