import {
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/** A summary as the API client returns it, from the list, an open or a read by ID. */
export type ConversationSummaryData = z.input<
  typeof ConversationsSchemas.ConversationSummarySchema
>;

/**
 * The by-ID entry. A summary seeded from a list item or an open response has
 * no `sendRestriction` until `GET /conversations/:id` answers.
 */
export type ConversationDetail = ConversationSummaryData & {
  sendRestriction?: ConversationsSchemas.SendRestriction | null;
};

type ConversationListCache = InfiniteData<
  ConversationsSchemas.ListConversationsResponse
>;

function findInList(
  queryClient: QueryClient,
  conversationId: string,
): ConversationSummaryData | undefined {
  return queryClient
    .getQueryData<ConversationListCache>(queryKeys.conversations.list())
    ?.pages.flatMap((page) => page.items)
    .find((item) => item.id === conversationId);
}

/**
 * Puts a summary the caller already holds under the by-ID key, so the
 * Conversation screen draws its header and Listing strip at once. The entry is
 * marked stale, so the screen still refreshes it from the API. A restriction
 * already read for this Conversation is kept.
 */
export function seedConversationDetail(
  queryClient: QueryClient,
  summary: ConversationSummaryData,
): void {
  queryClient.setQueryData<ConversationDetail>(
    queryKeys.conversations.detail(summary.id),
    (old) => ({ ...old, ...summary }),
    { updatedAt: 0 },
  );
}

/** Patches the by-ID entry in place; a no-op when nothing is cached. */
export function patchConversationDetail(
  queryClient: QueryClient,
  conversationId: string,
  patch: Partial<ConversationDetail>,
): void {
  queryClient.setQueryData<ConversationDetail>(
    queryKeys.conversations.detail(conversationId),
    (old) => (old ? { ...old, ...patch } : old),
  );
}

/**
 * Reads one Conversation by ID. Starts from the list cache when the
 * Conversation is there and always refreshes from the API.
 */
export function useConversation(conversationId: string) {
  const queryClient = useQueryClient();

  return useQuery<ConversationDetail>({
    queryKey: queryKeys.conversations.detail(conversationId),
    queryFn: () =>
      apiClient.get(
        `/conversations/${conversationId}`,
        ConversationsSchemas.GetConversationResponseSchema,
      ),
    enabled: !!conversationId,
    initialData: () => findInList(queryClient, conversationId),
    initialDataUpdatedAt: 0,
  });
}
