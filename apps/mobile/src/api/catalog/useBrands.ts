import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

// Covers all seeded brands in one trip (130 today). Bumping this if the brand
// list ever exceeds ~250 will require switching to useInfiniteQuery + cursor.
const BRAND_PAGE_SIZE = 300;

export function useBrands(localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  return useQuery({
    queryKey: queryKeys.catalog.brands(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/brands?limit=${BRAND_PAGE_SIZE}&locale=${locale}`,
        CatalogSchemas.BrandSummaryListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
