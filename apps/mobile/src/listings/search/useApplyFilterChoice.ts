import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";

import { useRecentChoicesStore } from "./recentSearches";
import type { ListingFilter } from "./useListingFilters";

/** Record the final form selection, including edits after More filters. */
export function useApplyFilterChoice(draft: ListingFilter, apply: () => void) {
  const record = useRecentChoicesStore((s) => s.record);
  const brands = useBrands();
  const models = useModels(draft.brandId ?? "");
  return () => {
    if (draft.brandId) {
      const modelIds = draft.modelIds ?? (draft.modelId ? [draft.modelId] : []);
      void record({
        brandId: draft.brandId,
        brandName: brands.data?.items.find((brand) => brand.id === draft.brandId)?.name ?? draft.brandId,
        modelIds: [...modelIds],
        modelNames: modelIds.map((id) => models.data?.items.find((model) => model.id === id)?.name ?? id),
      });
    }
    apply();
  };
}
