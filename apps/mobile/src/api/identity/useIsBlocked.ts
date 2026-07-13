import { useQuery } from "@tanstack/react-query";
import { IdentitySchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useIsBlocked(userId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.meBlocked(userId),
    queryFn: () =>
      apiClient.get(
        `/me/blocked-users/${userId}`,
        IdentitySchemas.IsBlockedResponseSchema,
      ),
    enabled: options.enabled && userId.length > 0,
  });
}
