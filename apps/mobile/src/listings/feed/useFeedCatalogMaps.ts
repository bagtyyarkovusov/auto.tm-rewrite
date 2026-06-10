import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useBrands } from "../../api/catalog/useBrands";
import { useRegions } from "../../api/catalog/useRegions";

type ListingSummary = ListingsSchemas.ListingSummary;

const ModelsListResponseSchema = z.object({
  items: z.array(CatalogSchemas.ModelSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const CitiesListResponseSchema = z.object({
  items: z.array(CatalogSchemas.CitySummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const MODEL_PAGE_SIZE = 500;

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function useFeedCatalogMaps(listings: ListingSummary[]) {
  const { i18n } = useTranslation();
  const locale = (i18n.language as "tk" | "ru" | "en") || "ru";
  const brands = useBrands(locale);
  const regions = useRegions(locale);

  const brandIds = useMemo(
    () => unique(listings.map((listing) => listing.brandId)),
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

  const regionIds = useMemo(
    () => regions.data?.items.map((region) => region.id).sort() ?? [],
    [regions.data?.items],
  );

  const cityQueries = useQueries({
    queries: regionIds.map((regionId) => ({
      queryKey: queryKeys.catalog.cities(regionId),
      queryFn: () =>
        apiClient.get(
          `/catalog/regions/${regionId}/cities`,
          CitiesListResponseSchema,
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
    const cityNames = new Map(
      cityQueries.flatMap(
        (query) => query.data?.items.map((city) => [city.id, city.name] as const) ?? [],
      ),
    );

    return {
      brandName: (id: string) => brandNames.get(id),
      modelName: (id: string) => modelNames.get(id),
      cityName: (id: string) => cityNames.get(id),
    };
  }, [brands.data?.items, modelQueries, cityQueries]);
}
