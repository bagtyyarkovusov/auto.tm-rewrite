import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

import { buildSearchParams } from "./useListingModelCounts";

interface UseListingBrandCountsOptions {
  /** Every filter except brand and models, which the endpoint rejects. */
  filters?: ListingsSchemas.ListingBrandCountQuery;
  enabled?: boolean;
}

/** Listings per brand for the Brand picker's Popular section and row counts. */
export function useListingBrandCounts({
  filters,
  enabled = true,
}: UseListingBrandCountsOptions) {
  return useQuery({
    queryKey: queryKeys.listings.brandCounts(filters ?? {}),
    queryFn: () =>
      apiClient.get(
        `/listings/filter-options/brands?${buildSearchParams(filters).toString()}`,
        ListingsSchemas.ListingBrandCountResponseSchema,
        { auth: false },
      ),
    enabled,
    staleTime: 30_000,
  });
}
