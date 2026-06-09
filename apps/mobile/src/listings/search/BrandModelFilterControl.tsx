import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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

  let modelEmptyMessage: string;
  if (!draft.brandId) {
    modelEmptyMessage = t("selectBrandFirst");
  } else if (modelSearch) {
    modelEmptyMessage = t("noModelsMatch");
  } else {
    modelEmptyMessage = t("noModelsAvailable");
  }

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
        label={t("brand")}
        value={selectedBrand?.name}
        placeholder={t("selectBrand")}
        onPress={() => setBrandOpen(true)}
      />

      <PickerRow
        label={t("model")}
        value={selectedModel?.name}
        placeholder={t("selectModel")}
        disabled={!draft.brandId}
        onPress={() => setModelOpen(true)}
      />

      <CatalogPickerSheet
        open={brandOpen}
        onOpenChange={(open) => {
          setBrandOpen(open);
          if (!open) setBrandSearch("");
        }}
        title={t("selectBrand")}
        searchPlaceholder={`${t("searchPlaceholder")}`}
        search={brandSearch}
        onSearchChange={setBrandSearch}
        items={filteredBrands}
        selectedId={draft.brandId}
        emptyMessage={
          brandSearch
            ? t("noBrandsMatch")
            : t("noBrandsAvailable")
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
        title={t("selectModel")}
        searchPlaceholder={`${t("searchPlaceholder")}`}
        search={modelSearch}
        onSearchChange={setModelSearch}
        items={filteredModels}
        selectedId={draft.modelId}
        emptyMessage={modelEmptyMessage}
        isLoading={modelsLoading}
        isError={modelsError}
        onSelect={handleSelectModel}
      />
    </View>
  );
}
