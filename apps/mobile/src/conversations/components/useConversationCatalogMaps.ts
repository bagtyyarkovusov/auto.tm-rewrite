import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useBrands } from "../../api/catalog/useBrands";

interface ConversationListing {
  brandId: string;
  modelId: string;
}

const ModelsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.ModelSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const MODEL_PAGE_SIZE = 500;

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function useConversationCatalogMaps(
  listings: (ConversationListing | null | undefined)[],
) {
  const { i18n } = useTranslation();
  const locale = (i18n.language as "tk" | "ru" | "en") || "ru";
  const brands = useBrands(locale);

  const brandIds = useMemo(
    () => unique(listings.filter((l): l is ConversationListing => !!l).map((l) => l.brandId)),
    [listings],
  );

  const modelQueries = useQueries({
    queries: brandIds.map((brandId) => ({
      queryKey: queryKeys.catalog.models(brandId, locale),
      queryFn: () =>
        apiClient.get(
          `/catalog/brands/${brandId}/models?limit=${MODEL_PAGE_SIZE}`,
          ModelsListResponseSchema,
          { auth: false },
        ),
      staleTime: 5 * 60_000,
    })),
  });

  return useMemo(() => {
    const brandNames = new Map(
      brands.data?.items.map((brand) => [brand.id, brand.name]) ?? [],
    );
    const modelNames = new Map(
      modelQueries.flatMap(
        (query) => query.data?.items.map((model) => [model.id, model.name] as const) ?? [],
      ),
    );

    return {
      brandName: (id: string) => brandNames.get(id),
      modelName: (id: string) => modelNames.get(id),
    };
  }, [brands.data?.items, modelQueries]);
}
