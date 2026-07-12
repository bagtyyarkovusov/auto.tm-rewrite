import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseListingModelCountsOptions {
  filters?: ListingsSchemas.ListingModelCountQuery;
  enabled?: boolean;
}

const DEBOUNCE_MS = 300;

export function buildSearchParams(
  filters: ListingsSchemas.ListingModelCountQuery | undefined,
): URLSearchParams {
  const params = new URLSearchParams();

  if (!filters) {
    return params;
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}

export function useListingModelCounts({
  filters,
  enabled = true,
}: UseListingModelCountsOptions) {
  const [debouncedFilters, setDebouncedFilters] =
    useState<ListingsSchemas.ListingModelCountQuery | undefined>(filters);

  useEffect(() => {
    if (!enabled) {
      setDebouncedFilters(filters);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filters, enabled]);

  return useQuery({
    queryKey: queryKeys.listings.modelCounts(debouncedFilters),
    queryFn: () =>
      apiClient.get(
        `/listings/filter-options/models?${buildSearchParams(debouncedFilters).toString()}`,
        ListingsSchemas.ListingModelCountResponseSchema,
        { auth: false },
      ),
    enabled: enabled && !!debouncedFilters?.brandId,
    staleTime: 30_000,
  });
}
