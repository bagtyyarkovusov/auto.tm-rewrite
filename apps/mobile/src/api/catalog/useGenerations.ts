import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const GenerationsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.GenerationSummarySchema),
});

export function useGenerations(modelId: string, locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.generations(modelId),
    queryFn: () =>
      apiClient.get(
        `/catalog/models/${modelId}/generations?locale=${locale}`,
        GenerationsListResponseSchema,
        { auth: false },
      ),
    enabled: !!modelId,
    staleTime: 5 * 60_000,
  });
}
