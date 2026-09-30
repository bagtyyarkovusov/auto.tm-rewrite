import { useEffect, useMemo, useState } from "react";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useBrands } from "../../api/catalog/useBrands";
import { useCatalogSearch } from "../../api/catalog/useCatalogSearch";
import { useListingBrandCounts } from "../../api/listings/useListingBrandCounts";

import {
  brandCountFilters,
  buildBrandSections,
  matchBrands,
  type BrandLetterSection,
  type BrandRow,
} from "./brandPickerLogic";
import { useRecentChoicesStore, type BrandModelChoice } from "./recentSearches";

export interface RecentRow {
  choice: BrandModelChoice;
  /** The catalog's current name for the brand, else the one saved with the choice. */
  brandName: string;
  logoUrl?: string;
}

export type BrandPickerContent =
  | { kind: "loading" }
  | { kind: "error"; error: unknown }
  | {
      kind: "browse";
      /** Empty when there is no Recent, or in Done mode. */
      recent: RecentRow[];
      popular: BrandRow[];
      alphabet: BrandLetterSection[];
    }
  | {
      kind: "matches";
      rows: BrandRow[];
      /** Still waiting for the first search response for this text. */
      searching: boolean;
      /** The catalog search failed; the picker offers a retry, not "no match". */
      failed: boolean;
    };

interface UseBrandPickerOptions {
  /** The buyer's other filters; brand counts respect them. */
  filters?: ListingsSchemas.ListingFilter;
  /** Recent shows only where picking it can go straight to Results. */
  showRecent: boolean;
}

/**
 * Everything the Brand picker shows, without any React Native view code:
 * search field state, Recent, Popular with counts, A to Z, and the brand
 * results of the catalog search.
 */
export function useBrandPicker({ filters, showRecent }: UseBrandPickerOptions) {
  const [query, setQuery] = useState("");

  const filtersKey = JSON.stringify(filters ?? {});
  const countFilters = useMemo(
    () => brandCountFilters(JSON.parse(filtersKey) as ListingsSchemas.ListingFilter),
    [filtersKey],
  );

  const brands = useBrands();
  const counts = useListingBrandCounts({ filters: countFilters });
  const search = useCatalogSearch(query);

  const recentItems = useRecentChoicesStore((s) => s.items);
  const hydrate = useRecentChoicesStore((s) => s.hydrate);
  const clearRecent = useRecentChoicesStore((s) => s.clear);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const countMap = useMemo(
    () =>
      counts.data
        ? new Map(counts.data.items.map((item) => [item.brandId, item.totalMatching]))
        : undefined,
    [counts.data],
  );

  const content = useMemo<BrandPickerContent>(() => {
    const brandList = brands.data?.items;
    if (!brandList) {
      return brands.isError ? { kind: "error", error: brands.error } : { kind: "loading" };
    }

    const matches = matchBrands(query, brandList, countMap, search.data);
    if (matches) {
      const searching =
        matches.length === 0 &&
        (search.isSettling || search.isFetching || search.isPlaceholderData);
      const failed = matches.length === 0 && !searching && search.isError;
      return { kind: "matches", rows: matches, searching, failed };
    }

    const byId = new Map(brandList.map((b) => [b.id, b]));
    const recent: RecentRow[] = showRecent
      ? recentItems.map((choice) => {
          const brand = byId.get(choice.brandId);
          return {
            choice,
            brandName: brand?.name ?? choice.brandName,
            ...(brand?.logoUrl ? { logoUrl: brand.logoUrl } : {}),
          };
        })
      : [];
    return { kind: "browse", recent, ...buildBrandSections(brandList, countMap) };
  }, [
    brands.data,
    brands.isError,
    brands.error,
    query,
    countMap,
    search.data,
    search.isFetching,
    search.isPlaceholderData,
    search.isSettling,
    search.isError,
    showRecent,
    recentItems,
  ]);

  return {
    query,
    setQuery,
    content,
    retry: () => {
      void brands.refetch();
      void counts.refetch();
      if (search.isError) void search.refetch();
    },
    clearRecent: () => void clearRecent(),
  };
}
