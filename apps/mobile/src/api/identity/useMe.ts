import { useQuery } from "@tanstack/react-query";
import { AuthSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => apiClient.get("/me", AuthSchemas.MeResponseSchema),
    enabled: options.enabled,
  });
}
