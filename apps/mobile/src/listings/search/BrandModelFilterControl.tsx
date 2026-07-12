import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SectionList,
  View,
  type SectionListRenderItem,
} from "react-native";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";
import { useListingModelCounts } from "../../api/listings/useListingModelCounts";

import type { ListingFilter } from "./useListingFilters";

import { Button } from "@/components/ui/button";
import { CatalogPickerSheet } from "@/components/listings/wizard/CatalogPickerSheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PickerRow } from "@/components/listings/wizard/PickerRow";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { resolveLocale } from "@/src/i18n/resources";

interface BrandModelFilterControlProps {
  draft: ListingFilter;
  setField: <K extends keyof ListingFilter>(
    key: K,
    value: ListingFilter[K],
  ) => void;
}

interface CatalogItem {
  id: string;
  name: string;
}

interface ModelWithCount extends CatalogItem {
  totalMatching: number;
}

interface ModelSection {
  title: string;
  data: ModelWithCount[];
}

function filterBySearch<T extends { name: string }>(items: T[], search: string) {
  if (!search) return items;
  const normalized = search.toLowerCase();
  return items.filter((i) => i.name.toLowerCase().includes(normalized));
}

function findById<T extends { id: string }>(items: T[], id?: string) {
  return items.find((i) => i.id === id);
}

function localeFromI18n(language: string): "tk" | "ru" | "en" {
  return resolveLocale(language);
}

function buildModelCountFilters(
  draft: ListingFilter,
): ListingsSchemas.ListingModelCountQuery | undefined {
  if (!draft.brandId) {
    return undefined;
  }

  return {
    brandId: draft.brandId,
    cityId: draft.cityId,
    priceMin: draft.priceMin,
    priceMax: draft.priceMax,
    yearMin: draft.yearMin,
    yearMax: draft.yearMax,
    condition: draft.condition,
  };
}

interface ModelMultiSelectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchPlaceholder: string;
  emptyMessage: string;
  models: ModelWithCount[];
  selectedIds: string[];
  isLoading: boolean;
  isError: boolean;
  onConfirm: (selectedIds: string[]) => void;
}

function ModelMultiSelectSheet({
  open,
  onOpenChange,
  title,
  searchPlaceholder,
  emptyMessage,
  models,
  selectedIds,
  isLoading,
  isError,
  onConfirm,
}: ModelMultiSelectSheetProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) {
      setLocalSelectedIds(selectedIds);
      setSearch("");
    }
  }, [open, selectedIds]);

  const filteredModels = useMemo(
    () => filterBySearch(models, search),
    [models, search],
  );

  const { popularModels, allModels } = useMemo(() => {
    const popular = filteredModels
      .filter((m) => m.totalMatching > 0)
      .sort((a, b) => {
        if (b.totalMatching !== a.totalMatching) {
          return b.totalMatching - a.totalMatching;
        }
        return a.name.localeCompare(b.name);
      });
    const popularIds = new Set(popular.map((m) => m.id));
    const all = filteredModels
      .filter((m) => !popularIds.has(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { popularModels: popular, allModels: all };
  }, [filteredModels]);

  const sections = useMemo<ModelSection[]>(() => {
    const result: ModelSection[] = [];
    if (popularModels.length > 0) {
      result.push({ title: t("popularModels"), data: popularModels });
    }
    if (allModels.length > 0) {
      result.push({ title: t("allModels"), data: allModels });
    }
    return result;
  }, [popularModels, allModels, t]);

  function toggleModel(modelId: string) {
    setLocalSelectedIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId],
    );
  }

  function handleClear() {
    setLocalSelectedIds([]);
  }

  function handleConfirm() {
    onConfirm(localSelectedIds);
    onOpenChange(false);
  }

  const renderItem: SectionListRenderItem<ModelWithCount, ModelSection> = ({
    item,
  }) => {
    const isSelected = localSelectedIds.includes(item.id);
    return (
      <Pressable
        onPress={() => toggleModel(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        className="flex-row items-center gap-3 py-3 active:bg-muted/60"
      >
        <Checkbox checked={isSelected} pointerEvents="none" />
        <Text className="flex-1 text-base text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        {item.totalMatching > 0 ? (
          <Text className="text-sm text-muted-foreground">
            {item.totalMatching}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[85%]" style={{ height: "85%" }}>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>{title}</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => onOpenChange(false)}
            accessibilityLabel={t("close")}
          >
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
        </SheetHeader>

        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChangeText={setSearch}
          className="mb-2"
        />

        {isLoading ? (
          <View className="gap-3 py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </View>
        ) : isError ? (
          <Text className="py-4 text-center text-sm text-destructive">
            {t("actionFailed")}
          </Text>
        ) : sections.length === 0 ? (
          <Text className="py-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </Text>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            className="min-h-0 flex-1"
            contentContainerClassName="pb-2"
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View className="bg-card py-2">
                <Text className="text-sm font-medium text-muted-foreground">
                  {section.title}
                </Text>
                <Separator className="mt-2" />
              </View>
            )}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <Separator />}
          />
        )}

        <View className="border-t border-border pt-3 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">
              {t("modelsSelected", { count: localSelectedIds.length })}
            </Text>
            {localSelectedIds.length > 0 ? (
              <Button variant="ghost" size="sm" onPress={handleClear}>
                <Text>{t("clear")}</Text>
              </Button>
            ) : null}
          </View>
          <Button onPress={handleConfirm}>
            <Text>{t("selectNModels", { count: localSelectedIds.length })}</Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}

export function BrandModelFilterControl({
  draft,
  setField,
}: BrandModelFilterControlProps) {
  const { t, i18n } = useTranslation();
  const locale = localeFromI18n(i18n.language);

  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");

  const {
    data: brandsData,
    isPending: brandsLoading,
    isError: brandsError,
  } = useBrands(locale);

  const {
    data: modelsData,
    isPending: modelsLoading,
    isError: modelsError,
  } = useModels(draft.brandId ?? "", locale);

  const { data: countsData, isPending: countsLoading, isError: countsError } =
    useListingModelCounts({
      filters: buildModelCountFilters(draft),
      enabled: !!draft.brandId,
    });

  const filteredBrands = filterBySearch(brandsData?.items ?? [], brandSearch);

  const selectedBrand = findById(brandsData?.items ?? [], draft.brandId);

  const modelsWithCounts = useMemo<ModelWithCount[]>(() => {
    const countMap = new Map<string, number>();
    countsData?.items.forEach((item) => {
      countMap.set(item.modelId, item.totalMatching);
    });
    return (modelsData?.items ?? []).map((model) => ({
      id: model.id,
      name: model.name,
      totalMatching: countMap.get(model.id) ?? 0,
    }));
  }, [modelsData, countsData]);

  const selectedModelNames = useMemo(() => {
    if (!draft.modelIds || draft.modelIds.length === 0) {
      return [];
    }
    return draft.modelIds
      .map((id) => modelsData?.items.find((m) => m.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  }, [draft.modelIds, modelsData]);

  const modelRowValue = useMemo(() => {
    if (!draft.brandId || selectedModelNames.length === 0) {
      return undefined;
    }
    if (selectedModelNames.length === 1) {
      return selectedModelNames[0];
    }
    return t("modelsSelected", { count: selectedModelNames.length });
  }, [draft.brandId, selectedModelNames, t]);

  let modelEmptyMessage: string;
  if (!draft.brandId) {
    modelEmptyMessage = t("selectBrandFirst");
  } else if (modelsData?.items.length === 0) {
    modelEmptyMessage = t("noModelsAvailable");
  } else {
    modelEmptyMessage = t("noModelsMatch");
  }

  function handleSelectBrand(brandId: string) {
    setField("brandId", brandId);
    setField("modelId", undefined);
    setField("modelIds", undefined);
    setBrandOpen(false);
    setBrandSearch("");
  }

  function handleConfirmModels(selectedIds: string[]) {
    setField(
      "modelIds",
      selectedIds.length > 0 ? selectedIds : undefined,
    );
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
        value={modelRowValue}
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
          brandSearch ? t("noBrandsMatch") : t("noBrandsAvailable")
        }
        isLoading={brandsLoading}
        isError={brandsError}
        onSelect={handleSelectBrand}
      />

      <ModelMultiSelectSheet
        open={modelOpen}
        onOpenChange={setModelOpen}
        title={t("selectModel")}
        searchPlaceholder={t("searchPlaceholder")}
        emptyMessage={modelEmptyMessage}
        models={modelsWithCounts}
        selectedIds={draft.modelIds ?? []}
        isLoading={modelsLoading || countsLoading}
        isError={modelsError || countsError}
        onConfirm={handleConfirmModels}
      />
    </View>
  );
}
