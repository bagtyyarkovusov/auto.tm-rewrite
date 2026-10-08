import { useInfiniteQuery, type InfiniteData, type QueryClient } from "@tanstack/react-query";
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

/** Persist the durable acknowledgement before the local outbox is reconciled. */
export function cacheAcknowledgedMessage(client: QueryClient, message: ConversationsSchemas.MessageSummary) {
  const key = queryKeys.conversations.messages(message.conversationId);
  const hadData = client.getQueryData(key) !== undefined;
  // A refetch started before the commit must not overwrite the acknowledged row.
  void client.cancelQueries({ queryKey: key });
  client.setQueryData<InfiniteData<ConversationsSchemas.ListMessagesResponse>>(key, (previous) => {
    const pages = (previous?.pages.length ? previous.pages : [{ items: [], nextCursor: null }]).map((page) => ({
      ...page,
      items: page.items.filter((row) => row.id !== message.id && !(message.clientMessageId && row.clientMessageId === message.clientMessageId)),
    }));
    const first = pages[0];
    if (first) first.items = [message, ...first.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { ...previous, pages, pageParams: previous?.pageParams ?? [null] };
  });
  // If the first history read was still loading, restart it after the commit to
  // recover older history as well as the acknowledged newest Message.
  if (!hadData) void client.invalidateQueries({ queryKey: key });
}
