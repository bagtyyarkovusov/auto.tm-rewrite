import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useOpenConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { listingId: string }) =>
      apiClient.post(
        "/conversations",
        input,
        ConversationsSchemas.OpenConversationResponseSchema,
      ),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(data.id),
      });
    },
  });
}
