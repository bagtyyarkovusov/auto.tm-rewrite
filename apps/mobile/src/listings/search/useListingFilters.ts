import { useCallback, useMemo, useRef, useState } from "react";
import type { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

export type ListingFilter = z.infer<typeof ListingsSchemas.ListingFilterSchema> & { sort?: ListingsSchemas.FeedSort };

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
  /** Clear the filters in both draft and active; the current sort stays. */
  reset: () => void;
  /** Number of fields with a non-empty value in active. */
  count: number;
  /** Replace route-provided state without writing it back to the route. */
  replace: (next: ListingFilter) => void;
  /** Apply an immediate Results control against committed filters. */
  commit: (patch: Partial<ListingFilter>) => void;
  /** False when draft contains an invalid combination (e.g. yearMin > yearMax). */
  isValid: boolean;
}

function isNonEmptyFilterValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function countActiveFields(filter: ListingFilter): number {
  let count = 0;
  for (const _key of Object.keys(filter)) {
    const key = _key as FilterKey;
    const value = filter[key];
    if (key !== "sort" && isNonEmptyFilterValue(value)) {
      count++;
    }
  }
  return count;
}

export function useListingFilters(initial: ListingFilter = {}, onApply?: (next: ListingFilter) => void): UseListingFiltersReturn {
  const [draft, setDraft] = useState<ListingFilter>(initial);
  const [active, setActive] = useState<ListingFilter>(initial);
  const activeRef = useRef(active);
  activeRef.current = active;
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;
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
      if (isNonEmptyFilterValue(value)) {
        (next as Record<FilterKey, ListingFilter[FilterKey]>)[key] = value;
      }
    }
    setActive(next as ListingFilter);
    onApplyRef.current?.(next as ListingFilter);
  }, []);

  // Reset clears the filters; the sort order is not a filter, so it stays.
  const reset = useCallback(() => {
    const { sort } = activeRef.current;
    const next: ListingFilter = sort ? { sort } : {};
    draftRef.current = next;
    setDraft(next);
    setActive(next);
    onApplyRef.current?.(next);
  }, []);

  const replace = useCallback((next: ListingFilter) => {
    draftRef.current = next;
    activeRef.current = next;
    setDraft(next);
    setActive(next);
  }, []);

  const commit = useCallback((patch: Partial<ListingFilter>) => {
    const next = Object.fromEntries(Object.entries({ ...activeRef.current, ...patch }).filter(([, value]) => isNonEmptyFilterValue(value)));
    replace(next);
    onApplyRef.current?.(next);
  }, [replace]);

  const isValid = useMemo(() => {
    if (
      draft.yearMin != null &&
      draft.yearMax != null &&
      draft.yearMin > draft.yearMax
    ) {
      return false;
    }

    if (
      draft.modelIds != null &&
      draft.modelIds.length > 0 &&
      !draft.brandId
    ) {
      return false;
    }

    return true;
  }, [draft]);

  const count = useMemo(() => countActiveFields(active), [active]);

  return { draft, active, setField, apply, reset, count, isValid, replace, commit };
}
