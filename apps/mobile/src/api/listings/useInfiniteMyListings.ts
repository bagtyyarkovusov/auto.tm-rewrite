import { useInfiniteQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseInfiniteMyListingsOptions {
  limit?: number;
}

export function useInfiniteMyListings(opts?: UseInfiniteMyListingsOptions) {
  const limit = opts?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: queryKeys.listings.myListingsInfinite(),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      return apiClient.get(
        `/me/listings?${params.toString()}`,
        ListingsSchemas.MyListingsResponseSchema,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}
