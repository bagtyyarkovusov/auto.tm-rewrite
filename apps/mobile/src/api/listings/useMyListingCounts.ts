import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/**
 * The signed-in User's Listing and draft counts. Keyed by User, and makes no
 * request while signed out (`userId` null). Every Listing and draft mutation
 * invalidates it, through `listings.all()` or `listings.myCountsAll()`.
 */
export function useMyListingCounts(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.listings.myCounts(userId),
    queryFn: () =>
      apiClient.get("/me/listings/counts", ListingsSchemas.MyListingCountsResponseSchema),
    enabled: userId !== null,
    staleTime: 30_000,
  });
}
