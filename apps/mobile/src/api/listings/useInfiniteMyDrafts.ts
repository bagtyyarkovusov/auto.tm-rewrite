import { useInfiniteQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseInfiniteMyDraftsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useInfiniteMyDrafts(opts?: UseInfiniteMyDraftsOptions) {
  const limit = opts?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: queryKeys.listings.myDraftsInfinite(),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      return apiClient.get(
        `/me/drafts?${params.toString()}`,
        ListingsSchemas.MyDraftsResponseSchema,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
    enabled: opts?.enabled,
  });
}
