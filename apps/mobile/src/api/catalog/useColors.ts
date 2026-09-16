import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

const ColorsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.ColorSummarySchema),
});

export function useColors(localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  return useQuery({
    queryKey: queryKeys.catalog.colors(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/colors?locale=${locale}`,
        ColorsListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
