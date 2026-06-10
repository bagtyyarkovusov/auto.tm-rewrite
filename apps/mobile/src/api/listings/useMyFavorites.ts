import { useInfiniteQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseMyFavoritesOptions {
  limit?: number;
}

export function useMyFavorites(opts?: UseMyFavoritesOptions) {
  const limit = opts?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: queryKeys.favorites.list(),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      return apiClient.get(
        `/favorites?${params.toString()}`,
        ListingsSchemas.MyFavoritesResponseSchema,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}
