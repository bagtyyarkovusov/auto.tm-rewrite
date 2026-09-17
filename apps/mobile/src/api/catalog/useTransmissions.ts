import { useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

const TransmissionsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.TransmissionSummarySchema),
});

export function useTransmissions(localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
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
