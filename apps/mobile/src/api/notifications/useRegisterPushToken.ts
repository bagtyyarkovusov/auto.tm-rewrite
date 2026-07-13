import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

import { notificationsQueryKeys } from "./queryKeys";

export function useRegisterPushToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      token: string;
      platform: "android" | "ios" | "web";
    }) =>
      apiClient.post(
        "/notifications/tokens",
        input,
        NotificationsSchemas.RegisterPushTokenResponseSchema,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationsQueryKeys.pushTokens(),
      });
    },
  });
}
