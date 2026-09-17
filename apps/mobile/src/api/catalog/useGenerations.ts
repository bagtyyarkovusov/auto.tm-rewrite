import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

const GenerationsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.GenerationSummarySchema),
});

// Generations per model are always a small list; 500 leaves headroom without
// forcing pagination through the picker.
const GENERATION_PAGE_SIZE = 500;

export function useGenerations(modelId: string, localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  return useQuery({
    queryKey: queryKeys.catalog.generations(modelId, locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/models/${modelId}/generations?limit=${GENERATION_PAGE_SIZE}&locale=${locale}`,
        GenerationsListResponseSchema,
        { auth: false },
      ),
    enabled: !!modelId,
    staleTime: 5 * 60_000,
  });
}
