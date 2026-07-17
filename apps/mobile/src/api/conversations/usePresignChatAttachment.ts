import { useMutation } from "@tanstack/react-query";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

export function usePresignChatAttachment() {
  return useMutation({
    mutationFn: (input: {
      conversationId: string;
      request: ConversationsSchemas.PresignChatAttachmentRequest;
    }) =>
      apiClient.post(
        `/conversations/${input.conversationId}/attachments/presign`,
        input.request,
        ConversationsSchemas.PresignChatAttachmentResponseSchema,
      ),
  });
}
