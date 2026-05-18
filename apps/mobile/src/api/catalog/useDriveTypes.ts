import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const DriveTypesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.DriveTypeSummarySchema),
});

export function useDriveTypes(locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.driveTypes(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/drive-types?locale=${locale}`,
        DriveTypesListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
