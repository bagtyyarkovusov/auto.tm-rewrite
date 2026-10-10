import { useQuery } from "@tanstack/react-query";
import { NotificationsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

import { notificationsQueryKeys } from "./queryKeys";

export function pushTokensQueryOptions() {
  return {
    queryKey: notificationsQueryKeys.pushTokens(),
    queryFn: () =>
      apiClient.get(
        "/notifications/tokens",
        NotificationsSchemas.ListPushTokensResponseSchema,
      ),
  };
}

export function usePushTokens() {
  return useQuery(pushTokensQueryOptions());
}
