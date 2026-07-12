import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseListingCountOptions {
  filters?: ListingsSchemas.ListingFilter;
  enabled?: boolean;
}

const DEBOUNCE_MS = 300;

function buildCountParams(
  filters: ListingsSchemas.ListingFilter | undefined,
): URLSearchParams {
  const params = new URLSearchParams();

  if (!filters) {
    return params;
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  return params;
}

export function useListingCount({ filters, enabled = true }: UseListingCountOptions) {
  const [debouncedFilters, setDebouncedFilters] =
    useState<ListingsSchemas.ListingFilter | undefined>(filters);

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
    queryKey: queryKeys.listings.count(debouncedFilters),
    queryFn: () =>
      apiClient.get(
        `/listings/count?${buildCountParams(debouncedFilters).toString()}`,
        ListingsSchemas.ListingCountResponseSchema,
        { auth: false },
      ),
    enabled,
    staleTime: 30_000,
  });
}
