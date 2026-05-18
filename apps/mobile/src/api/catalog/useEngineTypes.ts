import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const EngineTypesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.EngineTypeSummarySchema),
});

export function useEngineTypes(locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.engineTypes(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/engine-types?locale=${locale}`,
        EngineTypesListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
