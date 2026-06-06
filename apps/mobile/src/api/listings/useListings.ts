import { useInfiniteQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseListingsOptions {
  filters?: ListingsSchemas.ListingFilter;
  limit?: number;
}

function buildFeedParams(
  filters: ListingsSchemas.ListingFilter | undefined,
  limit: number,
  cursor: string | null,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (!filters) {
    return params;
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  return params;
}

export function useListings(opts?: UseListingsOptions) {
  const limit = opts?.limit ?? 20;
  const filters = opts?.filters;

  return useInfiniteQuery({
    queryKey: queryKeys.listings.list({ ...filters, limit }),
    queryFn: async ({ pageParam }) => {
      const params = buildFeedParams(filters, limit, pageParam);
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
