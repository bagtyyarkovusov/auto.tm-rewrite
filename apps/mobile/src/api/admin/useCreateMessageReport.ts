import { useMutation } from "@tanstack/react-query";
import { AdminSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

export function useCreateMessageReport() {
  return useMutation({
    mutationFn: (input: {
      conversationId: string;
      messageId: string;
      reason: AdminSchemas.CreateMessageReportRequest["reason"];
      details?: string;
    }) =>
      apiClient.post(
        `/conversations/${input.conversationId}/messages/${input.messageId}/report`,
        {
          reason: input.reason,
          ...(input.details ? { details: input.details } : {}),
        },
        AdminSchemas.CreateReportResponseSchema,
      ),
  });
}
