import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const ColorsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.ColorSummarySchema),
});

export function useColors(locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.colors(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/colors`,
        ColorsListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
