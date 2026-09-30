import { useMemo, useState } from "react";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";
import { useListingCount } from "../../api/listings/useListingCount";
import { useListingModelCounts } from "../../api/listings/useListingModelCounts";

import {
  buildModelRows,
  modelCountFilters,
  selectionFilters,
  toBrandModelChoice,
  toggleModelId,
  type ModelRows,
} from "./modelPickerLogic";

export type ModelPickerContent =
  | { kind: "loading" }
  | { kind: "error"; error: unknown }
  | { kind: "ready"; rows: ModelRows };

interface UseModelPickerOptions {
  brandId: string;
  /** Known when the Brand picker opened this; otherwise read from the catalog. */
  brandName?: string;
  /** Models already ticked, e.g. when changing the models Results shows. */
  initialModelIds?: readonly string[];
  /** The buyer's other filters; the counts respect them. */
  filters?: ListingsSchemas.ListingFilter;
}

/**
 * Everything the Model picker shows, without any React Native view code: the
 * models with counts, the ticked models (none means every model of the
 * brand), and the live count behind "Show N listings" or "Done".
 */
export function useModelPicker({
  brandId,
  brandName,
  initialModelIds = [],
  filters,
}: UseModelPickerOptions) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(() => [...initialModelIds]);

  const filtersKey = JSON.stringify(filters ?? {});
  const baseFilters = useMemo(
    () => JSON.parse(filtersKey) as ListingsSchemas.ListingFilter,
    [filtersKey],
  );
  const perModelFilters = useMemo(
    () => modelCountFilters(baseFilters, brandId),
    [baseFilters, brandId],
  );
  const countFilters = useMemo(
    () => selectionFilters(baseFilters, brandId, selected),
    [baseFilters, brandId, selected],
  );

  const brands = useBrands();
  const models = useModels(brandId);
  const modelCounts = useListingModelCounts({ filters: perModelFilters });
  const total = useListingCount({ filters: countFilters });

  const resolvedBrandName =
    brandName ?? brands.data?.items.find((b) => b.id === brandId)?.name ?? "";

  const content = useMemo<ModelPickerContent>(() => {
    if (!models.data) {
      return models.isError ? { kind: "error", error: models.error } : { kind: "loading" };
    }
    return {
      kind: "ready",
      rows: buildModelRows(models.data.items, modelCounts.data?.items, query),
    };
  }, [models.data, models.isError, models.error, modelCounts.data, query]);

  return {
    brandName: resolvedBrandName,
    query,
    setQuery,
    content,
    selected,
    toggle: (modelId: string) => setSelected((prev) => toggleModelId(prev, modelId)),
    /** "All models": untick everything, which means the whole brand. */
    selectAll: () => setSelected([]),
    /** Listings for the current selection; undefined until the count loads. */
    count: total.data?.totalMatching,
    countPending: total.isPending,
    /** The choice to hand on, named in tick order. */
    choice: () =>
      toBrandModelChoice(
        { id: brandId, name: resolvedBrandName },
        models.data?.items ?? [],
        selected,
      ),
    retry: () => {
      void models.refetch();
      void modelCounts.refetch();
    },
  };
}
