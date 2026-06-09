import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const RegionsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.RegionSummarySchema),
});

export function useRegions(locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.regions(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/regions`,
        RegionsListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
