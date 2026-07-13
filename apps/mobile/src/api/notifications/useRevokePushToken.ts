import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

import { notificationsQueryKeys } from "./queryKeys";

export function useRevokePushToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { token: string }) =>
      apiClient.delete(
        `/notifications/tokens/${encodeURIComponent(input.token)}`,
        NotificationsSchemas.RevokePushTokenResponseSchema,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationsQueryKeys.pushTokens(),
      });
    },
  });
}
