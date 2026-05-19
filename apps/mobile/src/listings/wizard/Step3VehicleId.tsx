import { useMemo, useState } from "react";
import { View } from "react-native";

import { useBrands } from "../../api/catalog/useBrands";
import { useGenerations } from "../../api/catalog/useGenerations";
import { useModels } from "../../api/catalog/useModels";

import type { WizardSchemas } from "@auto-tm/contracts";

import { CatalogPickerSheet } from "@/components/listings/wizard/CatalogPickerSheet";
import { PickerRow } from "@/components/listings/wizard/PickerRow";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

import {
  shouldShowVehicleFieldError,
  type VehicleField,
} from "./vehicleFieldErrorVisibility";

interface Step3VehicleIdProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
  showErrors?: boolean;
}

export default function Step3VehicleId({
  payload,
  onChange,
  fieldErrors,
  disabled,
  showErrors = false,
}: Step3VehicleIdProps) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [generationSearch, setGenerationSearch] = useState("");
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<VehicleField, boolean>>
  >({});

  const {
    data: brandsData,
    isPending: brandsLoading,
    isError: brandsError,
  } = useBrands();
  const {
    data: modelsData,
    isPending: modelsLoading,
    isError: modelsError,
  } = useModels(payload.brandId ?? "");
  const {
    data: generationsData,
    isPending: generationsLoading,
    isError: generationsError,
  } = useGenerations(payload.modelId ?? "");

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return brandsData?.items ?? [];
    return (brandsData?.items ?? []).filter((b) =>
      b.name.toLowerCase().includes(brandSearch.toLowerCase()),
    );
  }, [brandsData, brandSearch]);

  const filteredModels = useMemo(() => {
    if (!modelSearch) return modelsData?.items ?? [];
    return (modelsData?.items ?? []).filter((m) =>
      m.name.toLowerCase().includes(modelSearch.toLowerCase()),
    );
  }, [modelsData, modelSearch]);

  const filteredGenerations = useMemo(() => {
    if (!generationSearch) return generationsData?.items ?? [];
    return (generationsData?.items ?? []).filter((g) =>
      g.name.toLowerCase().includes(generationSearch.toLowerCase()),
    );
  }, [generationsData, generationSearch]);

  const selectedBrand = brandsData?.items.find((b) => b.id === payload.brandId);
  const selectedModel = modelsData?.items.find((m) => m.id === payload.modelId);
  const selectedGeneration = generationsData?.items.find(
    (g) => g.id === payload.generationId,
  );

  function handleSelectBrand(brandId: string) {
    markTouched("brandId");
    onChange({ brandId, modelId: undefined, generationId: undefined });
    setBrandOpen(false);
    setBrandSearch("");
  }

  function handleSelectModel(modelId: string) {
    markTouched("modelId");
    onChange({ modelId, generationId: undefined });
    setModelOpen(false);
    setModelSearch("");
  }

  function handleSelectGeneration(generationId: string) {
    onChange({ generationId });
    setGenerationOpen(false);
    setGenerationSearch("");
  }

  const [yearText, setYearText] = useState(payload.year?.toString() ?? "");

  function markTouched(field: VehicleField) {
    setTouchedFields((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  }

  function handleYearChange(text: string) {
    markTouched("year");
    const digits = text.replace(/\D/g, "").slice(0, 4);
    setYearText(digits);
    if (digits.length === 0) {
      onChange({ year: undefined });
      return;
    }
    if (digits.length === 4) {
      const num = parseInt(digits, 10);
      if (num >= 1900 && num <= 2100) {
        onChange({ year: num });
      }
    }
  }

  const generationHelper = !payload.modelId
    ? "Select a model first"
    : payload.modelId &&
        !generationsLoading &&
        !generationsError &&
        generationsData?.items.length === 0
      ? "No generations for this model yet."
      : undefined;

  const yearError = fieldErrors?.year;
  const visibleError = (field: VehicleField) =>
    shouldShowVehicleFieldError({
      field,
      showAllErrors: showErrors,
      touchedFields,
    })
      ? fieldErrors?.[field]
      : undefined;

  return (
    <View className="gap-4 py-4">
      <PickerRow
        label="Brand"
        required
        value={selectedBrand?.name}
        placeholder="Select brand"
        disabled={disabled}
        locked={disabled}
        error={visibleError("brandId")}
        onPress={() => {
          markTouched("brandId");
          setBrandOpen(true);
        }}
      />

      <PickerRow
        label="Model"
        required
        value={selectedModel?.name}
        placeholder="Select model"
        disabled={disabled || !payload.brandId}
        locked={disabled}
        error={visibleError("modelId")}
        onPress={() => {
          markTouched("modelId");
          setModelOpen(true);
        }}
      />

      <PickerRow
        label="Generation"
        value={selectedGeneration?.name}
        placeholder="Select generation"
        disabled={disabled || !payload.modelId || generationsLoading}
        locked={disabled}
        helper={generationHelper}
        onPress={() => setGenerationOpen(true)}
      />

      {/* Year */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Year *</Text>
        <View className={disabled ? "opacity-50" : undefined}>
          <Input
            value={yearText}
            onChangeText={handleYearChange}
            placeholder="YYYY"
            keyboardType="number-pad"
            editable={!disabled}
            maxLength={4}
            accessibilityState={{ disabled }}
          />
        </View>
        {yearError && visibleError("year") && (
          <Text className="text-sm text-destructive">{yearError}</Text>
        )}
        {disabled && (
          <Text className="text-sm text-muted-foreground">
            This field cannot be changed after publishing.
          </Text>
        )}
      </View>

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
        selectedId={payload.brandId}
        emptyMessage={brandSearch ? "No brands match your search" : "No brands available"}
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
        selectedId={payload.modelId}
        emptyMessage={modelSearch ? "No models match your search" : "No models available"}
        isLoading={modelsLoading}
        isError={modelsError}
        onSelect={handleSelectModel}
      />

      <CatalogPickerSheet
        open={generationOpen}
        onOpenChange={(open) => {
          setGenerationOpen(open);
          if (!open) setGenerationSearch("");
        }}
        title="Select generation"
        searchPlaceholder="Search generations..."
        search={generationSearch}
        onSearchChange={setGenerationSearch}
        items={filteredGenerations}
        selectedId={payload.generationId}
        emptyMessage={
          generationSearch
            ? "No generations match your search"
            : "No generations available"
        }
        isLoading={generationsLoading}
        isError={generationsError}
        onSelect={handleSelectGeneration}
      />
    </View>
  );
}
