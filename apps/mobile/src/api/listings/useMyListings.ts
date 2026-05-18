import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useMyListings(cursor?: string, limit: number = 20) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));

  return useQuery({
    queryKey: [...queryKeys.listings.myListings(), { cursor, limit }],
    queryFn: () =>
      apiClient.get(
        `/me/listings?${params.toString()}`,
        ListingsSchemas.MyListingsResponseSchema,
      ),
  });
}
