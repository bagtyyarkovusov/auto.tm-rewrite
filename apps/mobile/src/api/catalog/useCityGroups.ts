import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";
import { useRegions } from "./useRegions";

const CitiesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.CitySummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// One request holds a whole region's cities; the API allows up to 500.
const CITY_PAGE_SIZE = 500;

export interface CityGroup {
  region: CatalogSchemas.RegionSummary;
  cities: CatalogSchemas.CitySummary[];
}

/**
 * Every city grouped under its region, in the regions' order. There is no
 * all-cities endpoint, so this loads each region's cities; Turkmenistan has six.
 */
export function useCityGroups(localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  const regions = useRegions(localeOverride);
  const regionItems = regions.data?.items;

  const cityQueries = useQueries({
    queries: (regionItems ?? []).map((region) => ({
      queryKey: [...queryKeys.catalog.cities(region.id, locale), "all"] as const,
      queryFn: () =>
        apiClient.get(
          `/catalog/regions/${region.id}/cities?limit=${CITY_PAGE_SIZE}&locale=${locale}`,
          CitiesListResponseSchema,
          { auth: false },
        ),
      staleTime: 5 * 60_000,
    })),
  });

  return useMemo(() => {
    const groups: CityGroup[] = (regionItems ?? []).map((region, index) => ({
      region,
      cities: cityQueries[index]?.data?.items ?? [],
    }));
    return {
      groups,
      isPending: regions.isPending || cityQueries.some((query) => query.isPending),
      isError: regions.isError || cityQueries.some((query) => query.isError),
    };
  }, [regionItems, regions.isPending, regions.isError, cityQueries]);
}
