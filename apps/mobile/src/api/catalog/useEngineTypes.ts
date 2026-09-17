import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

const EngineTypesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.EngineTypeSummarySchema),
});

export function useEngineTypes(localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
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
