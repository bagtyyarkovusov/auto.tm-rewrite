import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useSendPostRefMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      conversationId: string;
      listingId: string;
      clientMessageId?: string;
    }) =>
      apiClient.post(
        `/conversations/${input.conversationId}/messages/post-ref`,
        {
          metadata: { listingId: input.listingId },
          clientMessageId: input.clientMessageId,
        },
        ConversationsSchemas.SendMessageResponseSchema,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(variables.conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(variables.conversationId),
      });
    },
  });
}
