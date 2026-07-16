import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

type ConversationListCache = InfiniteData<
  ConversationsSchemas.ListConversationsResponse
>;

interface MuteConversationInput {
  conversationId: string;
  muted: boolean;
}

function patchMutedAt(
  data: ConversationListCache | undefined,
  conversationId: string,
  mutedAt: string | null,
): ConversationListCache | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === conversationId ? { ...item, mutedAt } : item,
      ),
    })),
  };
}

export function useMuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MuteConversationInput) =>
      apiClient.post(
        `/conversations/${input.conversationId}/mute`,
        { muted: input.muted },
        ConversationsSchemas.MuteConversationResponseSchema,
      ),

    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.list(),
      });

      const previous = queryClient.getQueryData<ConversationListCache>(
        queryKeys.conversations.list(),
      );

      queryClient.setQueryData<ConversationListCache>(
        queryKeys.conversations.list(),
        (old) =>
          patchMutedAt(
            old,
            input.conversationId,
            input.muted ? new Date().toISOString() : null,
          ),
      );

      return { previous };
    },

    onError: (_error, input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          queryKeys.conversations.list(),
          context.previous,
        );
      }
    },

    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(input.conversationId),
      });
    },
  });
}
