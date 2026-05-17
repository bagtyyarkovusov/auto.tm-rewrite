import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useBrands(locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.brands(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/brands?locale=${locale}`,
        CatalogSchemas.BrandSummaryListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
