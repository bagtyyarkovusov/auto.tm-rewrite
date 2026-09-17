import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

const CitiesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.CitySummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export function useCities(regionId: string, localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  return useQuery({
    queryKey: queryKeys.catalog.cities(regionId, locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/regions/${regionId}/cities?locale=${locale}`,
        CitiesListResponseSchema,
        { auth: false },
      ),
    enabled: !!regionId,
    staleTime: 5 * 60_000,
  });
}
