import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { WizardSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { useBrands } from "../../api/catalog/useBrands";
import { useGenerations } from "../../api/catalog/useGenerations";
import { useModels } from "../../api/catalog/useModels";


import {
  shouldShowVehicleFieldError,
  type VehicleField,
} from "./vehicleFieldErrorVisibility";
import { VinField } from "./VinField";

import { CatalogPickerSheet } from "@/components/listings/wizard/CatalogPickerSheet";
import { PickerRow } from "@/components/listings/wizard/PickerRow";
import { Text } from "@/components/ui/text";


interface Step3VehicleIdProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
  showErrors?: boolean;
}

type CarPicker = "brand" | "model" | "year" | "generation";

// Newest first, from next year down to 1900: the range the contract accepts.
const YEAR_ITEMS = Array.from(
  { length: WizardSchemas.WIZARD_LIMITS.yearMax - WizardSchemas.WIZARD_LIMITS.yearMin + 1 },
  (_, i) => {
    const year = String(WizardSchemas.WIZARD_LIMITS.yearMax - i);
    return { id: year, name: year };
  },
);

/**
 * One sheet serves the four pickers, so a pick hands over to the next picker by
 * changing what the open sheet shows instead of closing one sheet and opening
 * another (founder decision D3 on #354). Closing the sheet ends the chain.
 */
function useCarPickers(
  payload: WizardSchemas.WizardDraftPayload,
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void,
  setTouchedFields: React.Dispatch<
    React.SetStateAction<Partial<Record<VehicleField, boolean>>>
  >,
) {
  const [openPicker, setOpenPicker] = useState<CarPicker | null>(null);
  const [search, setSearch] = useState("");
  // Set when the chain, not the seller, opened Generation: the sheet closes
  // again if the model turns out to have no generations.
  const [chainedToGeneration, setChainedToGeneration] = useState(false);

  const brands = useBrands();
  const models = useModels(payload.brandId ?? "");
  const generations = useGenerations(payload.modelId ?? "");

  const brandItems = brands.data?.items ?? [];
  const modelItems = models.data?.items ?? [];
  const generationItems = generations.data?.items ?? [];
  const generationsLoaded =
    !!payload.modelId && !generations.isPending && !generations.isError;
  const modelHasNoGenerations = generationsLoaded && generationItems.length === 0;

  useEffect(() => {
    if (openPicker === "generation" && chainedToGeneration && modelHasNoGenerations) {
      setOpenPicker(null);
      setChainedToGeneration(false);
    }
  }, [openPicker, chainedToGeneration, modelHasNoGenerations]);

  function open(picker: CarPicker | null, chained = false) {
    setOpenPicker(picker);
    setChainedToGeneration(picker === "generation" && chained);
    setSearch("");
  }

  function markTouched(field: VehicleField) {
    setTouchedFields((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  }

  function selectBrand(brandId: string) {
    markTouched("brandId");
    if (brandId !== payload.brandId) {
      onChange({ brandId, modelId: undefined, generationId: undefined });
    }
    open("model");
  }

  function selectModel(modelId: string) {
    markTouched("modelId");
    const changed = modelId !== payload.modelId;
    if (changed) onChange({ modelId, generationId: undefined });
    if (payload.year === undefined) open("year");
    // A changed model's generations are not loaded yet; the effect above
    // closes the sheet if there turn out to be none.
    else if (changed || (!payload.generationId && !modelHasNoGenerations)) {
      open("generation", true);
    } else open(null);
  }

  function selectYear(id: string) {
    markTouched("year");
    onChange({ year: Number(id) });
    if (payload.modelId && !payload.generationId && !modelHasNoGenerations) {
      open("generation", true);
    } else open(null);
  }

  function selectGeneration(generationId: string | undefined) {
    if (generationId !== payload.generationId) onChange({ generationId });
    open(null);
  }

  return {
    openPicker,
    open,
    search,
    setSearch,
    markTouched,
    brands,
    models,
    generations,
    selectedBrand: findById(brandItems, payload.brandId),
    selectedModel: findById(modelItems, payload.modelId),
    selectedGeneration: findById(generationItems, payload.generationId),
    brandItems: filterBySearch(brandItems, search),
    modelItems: filterBySearch(modelItems, search),
    generationItems,
    showGenerationRow:
      !!payload.generationId || (generationsLoaded && generationItems.length > 0),
    selectBrand,
    selectModel,
    selectYear,
    selectGeneration,
  };
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

function SkipGenerationRow({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-12 flex-row items-center rounded-md px-2 py-3"
    >
      <Text className="text-base text-muted-foreground">{t("skipGeneration")}</Text>
    </Pressable>
  );
}

function CarPickerSheet({
  payload,
  pickers,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  pickers: ReturnType<typeof useCarPickers>;
}) {
  const { t } = useTranslation();
  const picker = pickers.openPicker;
  const common = {
    open: picker !== null,
    onOpenChange: (isOpen: boolean) => {
      if (!isOpen) pickers.open(null);
    },
    searchPlaceholder: t("searchPlaceholder"),
    search: pickers.search,
    onSearchChange: pickers.setSearch,
  };

  if (picker === "model") {
    return (
      <CatalogPickerSheet
        {...common}
        title={t("selectModel")}
        items={pickers.modelItems}
        selectedId={payload.modelId}
        emptyMessage={pickers.search ? t("noModelsMatch") : t("noModelsAvailable")}
        isLoading={pickers.models.isPending}
        isError={pickers.models.isError}
        onSelect={pickers.selectModel}
      />
    );
  }
  if (picker === "year") {
    return (
      <CatalogPickerSheet
        {...common}
        searchable={false}
        title={t("selectYear")}
        items={YEAR_ITEMS}
        selectedId={payload.year === undefined ? undefined : String(payload.year)}
        emptyMessage=""
        isLoading={false}
        isError={false}
        onSelect={pickers.selectYear}
      />
    );
  }
  if (picker === "generation") {
    return (
      <CatalogPickerSheet
        {...common}
        searchable={false}
        title={t("selectGeneration")}
        items={pickers.generationItems}
        selectedId={payload.generationId}
        emptyMessage={t("noGenerationsAvailable")}
        isLoading={pickers.generations.isPending}
        isError={pickers.generations.isError}
        onSelect={pickers.selectGeneration}
        footer={<SkipGenerationRow onPress={() => pickers.selectGeneration(undefined)} />}
      />
    );
  }
  return (
    <CatalogPickerSheet
      {...common}
      title={t("selectBrand")}
      items={pickers.brandItems}
      selectedId={payload.brandId}
      emptyMessage={pickers.search ? t("noBrandsMatch") : t("noBrandsAvailable")}
      isLoading={pickers.brands.isPending}
      isError={pickers.brands.isError}
      onSelect={pickers.selectBrand}
    />
  );
}

export default function Step3VehicleId({
  payload,
  onChange,
  fieldErrors,
  disabled = false,
  showErrors = false,
}: Step3VehicleIdProps) {
  const { t } = useTranslation();
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<VehicleField, boolean>>
  >({});

  const pickers = useCarPickers(payload, onChange, setTouchedFields);

  const visibleError = (field: VehicleField) =>
    shouldShowVehicleFieldError({
      field,
      showAllErrors: showErrors,
      touchedFields,
    })
      ? fieldErrors?.[field]
      : undefined;

  return (
    <View className="gap-5 py-5">
      <PickerRow
        label={t("brand")}
        required
        value={pickers.selectedBrand?.name}
        placeholder={t("selectBrand")}
        disabled={disabled}
        locked={disabled}
        error={visibleError("brandId")}
        onPress={() => {
          pickers.markTouched("brandId");
          pickers.open("brand");
        }}
      />

      <PickerRow
        label={t("model")}
        required
        value={pickers.selectedModel?.name}
        placeholder={t("selectModel")}
        disabled={disabled || !payload.brandId}
        locked={disabled}
        error={visibleError("modelId")}
        onPress={() => {
          pickers.markTouched("modelId");
          pickers.open("model");
        }}
      />

      <PickerRow
        label={t("year")}
        required
        value={payload.year === undefined ? undefined : String(payload.year)}
        placeholder={t("selectYear")}
        disabled={disabled}
        locked={disabled}
        error={visibleError("year")}
        onPress={() => {
          pickers.markTouched("year");
          pickers.open("year");
        }}
      />

      {pickers.showGenerationRow && (
        <PickerRow
          label={t("generation")}
          value={pickers.selectedGeneration?.name}
          placeholder={t("selectGeneration")}
          disabled={disabled}
          locked={disabled}
          onPress={() => pickers.open("generation")}
        />
      )}

      <VinField
        payload={payload}
        onChange={onChange}
        disabled={disabled}
        error={showErrors ? fieldErrors?.vin : undefined}
      />

      <CarPickerSheet payload={payload} pickers={pickers} />
    </View>
  );
}
