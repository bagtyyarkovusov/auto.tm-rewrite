import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CatalogSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import type { Locale } from "../../i18n/resources";
import { queryKeys } from "../queryKeys";

import { useCatalogLocale } from "./useCatalogLocale";

/** The API returns nothing for shorter queries, so they are never sent. */
export const CATALOG_SEARCH_MIN_LENGTH = 2;
const DEBOUNCE_MS = 250;

/**
 * Brand and model search in any spelling (Russian, English or Turkmen, with
 * transliteration and one forgiven typo), as typed into a picker's search
 * field. Waits for typing to pause, and keeps the previous results on screen
 * while the next ones load.
 */
export function useCatalogSearch(query: string, localeOverride?: Locale) {
  const locale = useCatalogLocale(localeOverride);
  const trimmed = query.trim();
  const [debounced, setDebounced] = useState(trimmed);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const result = useQuery({
    queryKey: queryKeys.catalog.search(debounced, locale),
    queryFn: () =>
      apiClient.get(
        `/catalog/search?q=${encodeURIComponent(debounced)}&locale=${locale}`,
        CatalogSchemas.CatalogSearchResponseSchema,
        { auth: false },
      ),
    enabled: [...debounced].length >= CATALOG_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  // While typing is still settling, the results belong to earlier text.
  return { ...result, isSettling: debounced !== trimmed };
}
