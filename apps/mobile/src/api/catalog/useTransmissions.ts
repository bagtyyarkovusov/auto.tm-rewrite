import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const TransmissionsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.TransmissionSummarySchema),
});

export function useTransmissions(locale: "tk" | "ru" | "en" = "ru") {
  return useQuery({
    queryKey: queryKeys.catalog.transmissions(locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/transmissions?locale=${locale}`,
        TransmissionsListResponseSchema,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}
