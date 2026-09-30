import type { CatalogSchemas, ListingsSchemas } from "@auto-tm/contracts";

import { dropUndefined } from "./brandPickerLogic";
import type { BrandModelChoice } from "./recentSearches";

/**
 * Pure rules behind the Model picker (33 — Search & discovery): any number of
 * models or none, where none means every model of the brand.
 */

export interface ModelRow {
  id: string;
  name: string;
  /** Listings for this model; undefined while counts are loading or failed. */
  count?: number;
}

export interface ModelRows {
  /** Models with listings, most listings first. */
  popular: ModelRow[];
  /** Every other model, A to Z. */
  others: ModelRow[];
}

export interface PickedBrandRef {
  id: string;
  name: string;
}

/** Ticks or unticks one model, keeping the order the buyer ticked them in. */
export function toggleModelId(selected: readonly string[], modelId: string): string[] {
  return selected.includes(modelId)
    ? selected.filter((id) => id !== modelId)
    : [...selected, modelId];
}

const byName = (a: ModelRow, b: ModelRow) => a.name.localeCompare(b.name);

export function buildModelRows(
  models: readonly CatalogSchemas.ModelSummary[],
  counts: readonly ListingsSchemas.ListingModelCountItem[] | undefined,
  query: string,
): ModelRows {
  const q = query.trim().toLocaleLowerCase();
  const countById = counts ? new Map(counts.map((c) => [c.modelId, c.totalMatching])) : null;

  const rows = models
    .filter((m) => !q || m.name.toLocaleLowerCase().includes(q))
    .map((m): ModelRow => {
      const row: ModelRow = { id: m.id, name: m.name };
      if (countById) row.count = countById.get(m.id) ?? 0;
      return row;
    });

  const popular = rows
    .filter((r) => (r.count ?? 0) > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || byName(a, b));
  const popularIds = new Set(popular.map((r) => r.id));
  const others = rows.filter((r) => !popularIds.has(r.id)).sort(byName);

  return { popular, others };
}

type AnyFilter = ListingsSchemas.ListingFilter;

function withoutBrandAndModels(filters: AnyFilter) {
  const { brandId: _brand, modelId: _model, modelIds: _models, ...rest } = filters;
  return dropUndefined(rest);
}

/**
 * The filters "Show N listings" counts: the buyer's other filters with this
 * brand and the ticked models. No ticked model counts the whole brand.
 */
export function selectionFilters(
  filters: AnyFilter,
  brandId: string,
  modelIds: readonly string[],
): AnyFilter {
  return {
    ...withoutBrandAndModels(filters),
    brandId,
    ...(modelIds.length > 0 ? { modelIds: [...modelIds] } : {}),
  };
}

/** The filters for the per-model counts: the brand, without any model filter. */
export function modelCountFilters(
  filters: AnyFilter,
  brandId: string,
): ListingsSchemas.ListingModelCountQuery {
  return { ...withoutBrandAndModels(filters), brandId };
}

/** What the picker hands on: the brand and the ticked models, named, in tick order. */
export function toBrandModelChoice(
  brand: PickedBrandRef,
  models: readonly CatalogSchemas.ModelSummary[],
  modelIds: readonly string[],
): BrandModelChoice {
  const byId = new Map(models.map((m) => [m.id, m.name]));
  const known = modelIds.filter((id) => byId.has(id));
  return {
    brandId: brand.id,
    brandName: brand.name,
    modelIds: known,
    modelNames: known.map((id) => byId.get(id) ?? id),
  };
}
