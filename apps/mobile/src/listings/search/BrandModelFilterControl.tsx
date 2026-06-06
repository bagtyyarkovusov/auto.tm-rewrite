import { useState } from "react";
import { View } from "react-native";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";

import type { ListingFilter } from "./useListingFilters";

import { CatalogPickerSheet } from "@/components/listings/wizard/CatalogPickerSheet";
import { PickerRow } from "@/components/listings/wizard/PickerRow";

interface BrandModelFilterControlProps {
  draft: ListingFilter;
  setField: <K extends keyof ListingFilter>(
    key: K,
    value: ListingFilter[K],
  ) => void;
}

function filterBySearch<T extends { name: string }>(items: T[], search: string) {
  if (!search) return items;
  return items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );
}

function findById<T extends { id: string }>(items: T[], id?: string) {
  return items.find((i) => i.id === id);
}

export function BrandModelFilterControl({
  draft,
  setField,
}: BrandModelFilterControlProps) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  const {
    data: brandsData,
    isPending: brandsLoading,
    isError: brandsError,
  } = useBrands();

  const {
    data: modelsData,
    isPending: modelsLoading,
    isError: modelsError,
  } = useModels(draft.brandId ?? "");

  const filteredBrands = filterBySearch(brandsData?.items ?? [], brandSearch);
  const filteredModels = filterBySearch(modelsData?.items ?? [], modelSearch);

  const selectedBrand = findById(brandsData?.items ?? [], draft.brandId);
  const selectedModel = findById(modelsData?.items ?? [], draft.modelId);

  function handleSelectBrand(brandId: string) {
    setField("brandId", brandId);
    setField("modelId", undefined);
    setBrandOpen(false);
    setBrandSearch("");
  }

  function handleSelectModel(modelId: string) {
    setField("modelId", modelId);
    setModelOpen(false);
    setModelSearch("");
  }

  return (
    <View className="gap-4">
      <PickerRow
        label="Brand"
        value={selectedBrand?.name}
        placeholder="Select brand"
        onPress={() => setBrandOpen(true)}
      />

      <PickerRow
        label="Model"
        value={selectedModel?.name}
        placeholder="Select model"
        disabled={!draft.brandId}
        onPress={() => setModelOpen(true)}
      />

      <CatalogPickerSheet
        open={brandOpen}
        onOpenChange={(open) => {
          setBrandOpen(open);
          if (!open) setBrandSearch("");
        }}
        title="Select brand"
        searchPlaceholder="Search brands..."
        search={brandSearch}
        onSearchChange={setBrandSearch}
        items={filteredBrands}
        selectedId={draft.brandId}
        emptyMessage={
          brandSearch
            ? "No brands match your search"
            : "No brands available"
        }
        isLoading={brandsLoading}
        isError={brandsError}
        onSelect={handleSelectBrand}
      />

      <CatalogPickerSheet
        open={modelOpen}
        onOpenChange={(open) => {
          setModelOpen(open);
          if (!open) setModelSearch("");
        }}
        title="Select model"
        searchPlaceholder="Search models..."
        search={modelSearch}
        onSearchChange={setModelSearch}
        items={filteredModels}
        selectedId={draft.modelId}
        emptyMessage={
          !draft.brandId
            ? "Select a brand first"
            : modelSearch
              ? "No models match your search"
              : "No models available"
        }
        isLoading={modelsLoading}
        isError={modelsError}
        onSelect={handleSelectModel}
      />
    </View>
  );
}
