import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

const BodyTypesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.BodyTypeSummarySchema),
});

export function useBodyTypes(localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  return useQuery({
    queryKey: queryKeys.catalog.bodyTypes(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/body-types?locale=${locale}`,
        BodyTypesListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
