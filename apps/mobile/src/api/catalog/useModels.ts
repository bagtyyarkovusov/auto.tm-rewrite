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

export function useModels(brandId: string, locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.models(brandId),
    queryFn: () =>
      apiClient.get(
        `/catalog/brands/${brandId}/models?locale=${locale}`,
        ModelsListResponseSchema,
        { auth: false },
      ),
    enabled: !!brandId,
    staleTime: 5 * 60_000,
  });
}
