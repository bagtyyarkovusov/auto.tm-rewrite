import { useInfiniteQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseListingsOptions {
  filters?: ListingsSchemas.ListingCountQuery;
  limit?: number;
  /**
   * The signed-in viewer's id. When set, the request carries the session so
   * each item reports `isFavorited`; `null` keeps the request anonymous.
   */
  viewerId?: string | null;
  enabled?: boolean;
}

function buildFeedParams(
  filters: ListingsSchemas.ListingCountQuery | undefined,
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
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}

export function useListings(opts?: UseListingsOptions) {
  const limit = opts?.limit ?? 20;
  const filters = opts?.filters;
  const viewerId = opts?.viewerId ?? null;

  return useInfiniteQuery({
    queryKey: queryKeys.listings.list({ ...filters, limit }, viewerId),
    queryFn: async ({ pageParam }) => {
      const params = buildFeedParams(filters, limit, pageParam);
      return apiClient.get(
        `/listings?${params.toString()}`,
        ListingsSchemas.FeedResponseSchema,
        { auth: viewerId !== null },
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
    enabled: opts?.enabled ?? true,
  });
}
