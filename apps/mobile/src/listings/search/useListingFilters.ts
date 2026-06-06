import { useCallback, useMemo, useRef, useState } from "react";
import type { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

export type ListingFilter = z.infer<typeof ListingsSchemas.ListingFilterSchema>;

type FilterKey = keyof ListingFilter;

export interface UseListingFiltersReturn {
  /** In-progress filter edits (live inside the sheet). */
  draft: ListingFilter;
  /** Committed filters consumed by the query hook. */
  active: ListingFilter;
  /** Update a single field on the draft. */
  setField: <K extends FilterKey>(key: K, value: ListingFilter[K]) => void;
  /** Commit draft → active. */
  apply: () => void;
  /** Clear both draft and active. */
  reset: () => void;
  /** Number of fields with a non-empty value in active. */
  count: number;
  /** False when draft contains an invalid combination (e.g. yearMin > yearMax). */
  isValid: boolean;
}

function countActiveFields(filter: ListingFilter): number {
  let count = 0;
  for (const _key of Object.keys(filter)) {
    const key = _key as FilterKey;
    const value = filter[key];
    if (value !== undefined && value !== null && value !== "") {
      count++;
    }
  }
  return count;
}

export function useListingFilters(): UseListingFiltersReturn {
  const [draft, setDraft] = useState<ListingFilter>({});
  const [active, setActive] = useState<ListingFilter>({});
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const setField = useCallback(<K extends FilterKey>(key: K, value: ListingFilter[K]) => {
    draftRef.current = { ...draftRef.current, [key]: value };
    setDraft(draftRef.current);
  }, []);

  const apply = useCallback(() => {
    const currentDraft = draftRef.current;
    const next: Partial<ListingFilter> = {};
    for (const _key of Object.keys(currentDraft)) {
      const key = _key as FilterKey;
      const value = currentDraft[key];
      if (value !== undefined && value !== null && value !== "") {
        (next as Record<FilterKey, ListingFilter[FilterKey]>)[key] = value;
      }
    }
    setActive(next as ListingFilter);
  }, []);

  const reset = useCallback(() => {
    draftRef.current = {};
    setDraft({});
    setActive({});
  }, []);

  const isValid = useMemo(() => {
    if (
      draft.yearMin != null &&
      draft.yearMax != null &&
      draft.yearMin > draft.yearMax
    ) {
      return false;
    }
    return true;
  }, [draft]);

  const count = useMemo(() => countActiveFields(active), [active]);

  return { draft, active, setField, apply, reset, count, isValid };
}
