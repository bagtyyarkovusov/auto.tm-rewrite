import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UpdateWatermarkInput {
  conversationId: string;
  lastReadAt?: string;
  lastDeliveredAt?: string;
}

export function useUpdateWatermark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWatermarkInput) =>
      apiClient.post(
        `/conversations/${input.conversationId}/watermark`,
        {
          ...(input.lastReadAt ? { lastReadAt: input.lastReadAt } : {}),
          ...(input.lastDeliveredAt
            ? { lastDeliveredAt: input.lastDeliveredAt }
            : {}),
        },
        ConversationsSchemas.UpdateWatermarkResponseSchema,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(variables.conversationId),
      });
    },
  });
}
