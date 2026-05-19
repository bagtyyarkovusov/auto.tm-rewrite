import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const ModelsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.ModelSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// Covers any single brand's model list in one trip. Largest brands today carry
// well under 200 models; 500 is the safe headroom.
const MODEL_PAGE_SIZE = 500;

export function useModels(brandId: string, locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.models(brandId, locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/brands/${brandId}/models?locale=${locale}&limit=${MODEL_PAGE_SIZE}`,
        ModelsListResponseSchema,
        { auth: false },
      ),
    enabled: !!brandId,
    staleTime: 5 * 60_000,
  });
}
