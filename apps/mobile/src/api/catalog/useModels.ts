import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

const ModelsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.ModelSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// Covers any single brand's model list in one trip. Largest brands today carry
// well under 200 models; 500 is the safe headroom.
const MODEL_PAGE_SIZE = 500;

export function useModels(brandId: string, localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  return useQuery({
    queryKey: queryKeys.catalog.models(brandId, locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/brands/${brandId}/models?limit=${MODEL_PAGE_SIZE}&locale=${locale}`,
        ModelsListResponseSchema,
        { auth: false },
      ),
    enabled: !!brandId,
    staleTime: 5 * 60_000,
  });
}
