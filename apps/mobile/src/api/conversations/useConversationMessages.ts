import { useInfiniteQuery } from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseConversationMessagesOptions {
  conversationId: string;
  limit?: number;
}

export function useConversationMessages(opts: UseConversationMessagesOptions) {
  const { conversationId, limit = 20 } = opts;

  return useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(conversationId),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      return apiClient.get(
        `/conversations/${conversationId}/messages?${params.toString()}`,
        ConversationsSchemas.ListMessagesResponseSchema,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
    enabled: !!conversationId,
  });
}
