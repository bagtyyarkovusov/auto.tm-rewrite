import { useQuery } from "@tanstack/react-query";
import { NotificationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

import { notificationsQueryKeys } from "./queryKeys";

export function usePushTokens() {
  return useQuery({
    queryKey: notificationsQueryKeys.pushTokens(),
    queryFn: () =>
      apiClient.get(
        "/notifications/tokens",
        NotificationsSchemas.ListPushTokensResponseSchema,
      ),
  });
}
