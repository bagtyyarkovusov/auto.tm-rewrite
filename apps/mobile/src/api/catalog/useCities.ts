import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const CitiesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.CitySummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export function useCities(regionId: string, _locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.cities(regionId),
    queryFn: () =>
      apiClient.get(
        `/catalog/regions/${regionId}/cities`,
        CitiesListResponseSchema,
        { auth: false },
      ),
    enabled: !!regionId,
    staleTime: 5 * 60_000,
  });
}
