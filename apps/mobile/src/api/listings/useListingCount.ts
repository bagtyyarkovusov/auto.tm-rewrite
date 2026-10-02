import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

interface UseListingCountOptions {
  filters?: ListingsSchemas.ListingCountQuery;
  enabled?: boolean;
}

const DEBOUNCE_MS = 300;

function buildCountParams(
  filters: ListingsSchemas.ListingCountQuery | undefined,
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

/**
 * Counts the listings matching `filters`, debounced. `enabled` is the caller's
 * "these criteria are valid" gate: a draft the caller rejects is never copied
 * into the debounced filters, and the request only goes out once the debounced
 * filters equal the current ones. Otherwise a draft that turns valid would
 * first request the last invalid criteria (and get HTTP 400) before the
 * debounce caught up.
 */
export function useListingCount({ filters, enabled = true }: UseListingCountOptions) {
  const [debouncedFilters, setDebouncedFilters] =
    useState<ListingsSchemas.ListingCountQuery | undefined>(filters);

  const settled =
    buildCountParams(filters).toString() === buildCountParams(debouncedFilters).toString();

  useEffect(() => {
    if (!enabled || settled) {
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filters, enabled, settled]);

  return useQuery({
    queryKey: queryKeys.listings.count(debouncedFilters),
    queryFn: () =>
      apiClient.get(
        `/listings/count?${buildCountParams(debouncedFilters).toString()}`,
        ListingsSchemas.ListingCountResponseSchema,
        { auth: false },
      ),
    enabled: enabled && settled,
    staleTime: 30_000,
  });
}
