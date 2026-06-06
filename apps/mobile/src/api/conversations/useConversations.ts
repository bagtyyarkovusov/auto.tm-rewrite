import { useInfiniteQuery } from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseConversationsOptions {
  limit?: number;
}

export function useConversations(opts?: UseConversationsOptions) {
  const limit = opts?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      return apiClient.get(
        `/conversations?${params.toString()}`,
        ConversationsSchemas.ListConversationsResponseSchema,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}
