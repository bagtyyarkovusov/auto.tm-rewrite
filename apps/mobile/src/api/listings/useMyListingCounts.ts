import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useMyListingCounts(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.listings.myCounts(userId),
    queryFn: () =>
      apiClient.get("/me/listings/counts", ListingsSchemas.MyListingCountsResponseSchema),
    enabled: false,
  });
}
