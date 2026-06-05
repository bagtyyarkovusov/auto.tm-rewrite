import { useInfiniteQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseListingsOptions {
  limit?: number;
}

export function useListings(opts?: UseListingsOptions) {
  const limit = opts?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: queryKeys.listings.list({ limit }),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      return apiClient.get(
        `/listings?${params.toString()}`,
        ListingsSchemas.FeedResponseSchema,
        { auth: false },
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}
