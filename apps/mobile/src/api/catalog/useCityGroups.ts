import { useCallback } from "react";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
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

type CitiesListResponse = z.infer<typeof CitiesListResponseSchema>;

// One request holds a whole region's cities; the API allows up to 500.
const CITY_PAGE_SIZE = 500;

export interface CityGroup {
  region: CatalogSchemas.RegionSummary;
  cities: CatalogSchemas.CitySummary[];
}

/** The city with this id and the region it sits under. */
export function findCityInGroups(groups: CityGroup[], cityId?: string) {
  if (!cityId) return undefined;
  for (const group of groups) {
    const city = group.cities.find((c) => c.id === cityId);
    if (city) return { city, region: group.region };
  }
  return undefined;
}

/**
 * Every city grouped under its region, in the regions' order. There is no
 * all-cities endpoint, so this loads each region's cities; Turkmenistan has six.
 */
export function useCityGroups(localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  const regions = useRegions(localeOverride);
  const regionItems = regions.data?.items;
  const regionsPending = regions.isPending;
  const regionsError = regions.isError;

  // `combine` runs again only when a city query's result or this function
  // changes, and its result is structurally shared between renders.
  const combine = useCallback(
    (results: UseQueryResult<CitiesListResponse>[]) => ({
      groups: (regionItems ?? []).map(
        (region, index): CityGroup => ({
          region,
          cities: results[index]?.data?.items ?? [],
        }),
      ),
      isPending: regionsPending || results.some((query) => query.isPending),
      isError: regionsError || results.some((query) => query.isError),
    }),
    [regionItems, regionsPending, regionsError],
  );

  return useQueries({
    queries: (regionItems ?? []).map((region) => ({
      queryKey: queryKeys.catalog.citiesAll(region.id, locale),
      queryFn: () =>
        apiClient.get(
          `/catalog/regions/${region.id}/cities?limit=${CITY_PAGE_SIZE}&locale=${locale}`,
          CitiesListResponseSchema,
          { auth: false },
        ),
      staleTime: 5 * 60_000,
    })),
    combine,
  });
}
