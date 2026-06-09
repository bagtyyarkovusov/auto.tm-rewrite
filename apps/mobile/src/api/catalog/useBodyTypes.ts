import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const BodyTypesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.BodyTypeSummarySchema),
});

export function useBodyTypes(locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.bodyTypes(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/body-types`,
        BodyTypesListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
