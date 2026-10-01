import type { CatalogSchemas, ListingsSchemas } from "@auto-tm/contracts";

import type { ListingFilter } from "./useListingFilters";

/**
 * Pure rules behind the Brand picker (33 — Search & discovery): Popular with
 * counts, A to Z under letters, and search results limited to brands. The
 * component only renders what these return.
 */

/** Most Popular brands shown above A to Z. */
export const POPULAR_BRAND_LIMIT = 10;

export interface BrandRow {
  id: string;
  name: string;
  /** Missing when no logo is uploaded: the row shows `brandInitial(name)`. */
  logoUrl?: string;
  /** Listings for this brand; undefined while counts are loading or failed. */
  count?: number;
}

export interface BrandLetterSection {
  letter: string;
  rows: BrandRow[];
}

export interface BrandSections {
  popular: BrandRow[];
  alphabet: BrandLetterSection[];
}

/** Brand counts keyed by brand id. */
export type BrandCounts = ReadonlyMap<string, number>;

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** The letter shown in place of a missing logo, and the A to Z heading. */
export function brandInitial(name: string): string {
  const match = LETTER_OR_DIGIT.exec(name);
  return match ? match[0].toLocaleUpperCase() : "?";
}

function toRow(
  brand: Pick<CatalogSchemas.BrandSummary, "id" | "name" | "logoUrl">,
  counts: BrandCounts | undefined,
): BrandRow {
  const row: BrandRow = { id: brand.id, name: brand.name };
  if (brand.logoUrl) row.logoUrl = brand.logoUrl;
  if (counts) row.count = counts.get(brand.id) ?? 0;
  return row;
}

const byName = (a: BrandRow, b: BrandRow) => a.name.localeCompare(b.name);

export function buildBrandSections(
  brands: readonly CatalogSchemas.BrandSummary[],
  counts: BrandCounts | undefined,
): BrandSections {
  const rows = brands.map((brand) => toRow(brand, counts));

  const popular = rows
    .filter((row) => (row.count ?? 0) > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || byName(a, b))
    .slice(0, POPULAR_BRAND_LIMIT);

  const byLetter = new Map<string, BrandRow[]>();
  for (const row of rows) {
    const letter = brandInitial(row.name);
    const list = byLetter.get(letter) ?? [];
    list.push(row);
    byLetter.set(letter, list);
  }
  const alphabet = [...byLetter.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, list]) => ({ letter, rows: list.sort(byName) }));

  return { popular, alphabet };
}

/**
 * The brands matching what the buyer typed, or null when the field is empty
 * (the picker then shows Recent, Popular and A to Z).
 *
 * Two or more characters go to the catalog search, which matches Russian,
 * English and Turkmen spellings and forgives a typo; the picker keeps only
 * its brand results, since a Brand picker picks brands. The API ignores a
 * single character, so one letter is matched locally against brand names.
 */
export function matchBrands(
  query: string,
  brands: readonly CatalogSchemas.BrandSummary[],
  counts: BrandCounts | undefined,
  search: CatalogSchemas.CatalogSearchResponse | undefined,
): BrandRow[] | null {
  const q = query.trim();
  if (!q) return null;

  if ([...q].length === 1) {
    const prefix = q.toLocaleLowerCase();
    return brands
      .filter((b) => b.name.toLocaleLowerCase().startsWith(prefix))
      .map((b) => toRow(b, counts))
      .sort(byName);
  }

  if (!search) return [];

  const byId = new Map(brands.map((b) => [b.id, b]));
  const seen = new Set<string>();
  const rows: BrandRow[] = [];
  for (const result of search.results) {
    if (result.kind !== "brand" || seen.has(result.brandId)) continue;
    seen.add(result.brandId);
    rows.push(toRow(byId.get(result.brandId) ?? { id: result.brandId, name: result.label }, counts));
  }
  return rows;
}

/**
 * The filters sent to the brand counts endpoint: everything except brand and
 * models, which that endpoint rejects because it counts every brand.
 */
export function brandCountFilters(
  filters: ListingFilter,
): ListingsSchemas.ListingBrandCountQuery {
  return withoutBrandAndModels(filters);
}

// Sort is Results-only ordering. The brand and model counts endpoints reject it with a 400.
const BRAND_AND_MODEL_KEYS = new Set(["brandId", "modelId", "modelIds", "sort"]);

/** The buyer's other filters (city, year, price, condition), without empty values or sort. */
export function withoutBrandAndModels(
  filters: ListingFilter,
): ListingsSchemas.ListingBrandCountQuery {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([key, value]) => value !== undefined && !BRAND_AND_MODEL_KEYS.has(key),
    ),
  ) as ListingsSchemas.ListingBrandCountQuery;
}
