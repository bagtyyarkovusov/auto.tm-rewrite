import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

// Covers all seeded brands in one trip (130 today). Bumping this if the brand
// list ever exceeds ~250 will require switching to useInfiniteQuery + cursor.
const BRAND_PAGE_SIZE = 300;

export function useBrands(locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.brands(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/brands?limit=${BRAND_PAGE_SIZE}`,
        CatalogSchemas.BrandSummaryListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
