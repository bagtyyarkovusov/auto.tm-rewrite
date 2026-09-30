import { useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";

import { BrandPicker } from "./BrandPicker";
import { ModelPicker } from "./ModelPicker";
import {
  choiceFormFields,
  createDonePickerActions,
  type DonePickerStep,
} from "./pickerActions";
import { useRecentChoicesStore } from "./recentSearches";
import type { ListingFilter } from "./useListingFilters";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PickerRow } from "@/components/listings/wizard/PickerRow";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface BrandModelFilterControlProps {
  draft: ListingFilter;
  setField: <K extends keyof ListingFilter>(
    key: K,
    value: ListingFilter[K],
  ) => void;
}

/**
 * Brand and Model rows inside the filter sheet (the interim Search
 * parameters). Each opens the Brand or Model picker in Done mode: the
 * pickers step inside one sheet and "Done" writes the brand and models back
 * to the form without applying it.
 */
export function BrandModelFilterControl({
  draft,
  setField,
}: BrandModelFilterControlProps) {
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const [step, setStep] = useState<DonePickerStep | null>(null);
  const record = useRecentChoicesStore((s) => s.record);

  const { data: brandsData } = useBrands();
  const { data: modelsData } = useModels(draft.brandId ?? "");
  const selectedBrand = brandsData?.items.find((b) => b.id === draft.brandId);

  const actions = useMemo(
    () =>
      createDonePickerActions({
        setStep,
        record: (choice) => void record(choice),
        onDone: (choice) => {
          const fields = choiceFormFields(choice);
          setField("brandId", fields.brandId);
          setField("modelId", fields.modelId);
          setField("modelIds", fields.modelIds);
          setStep(null);
        },
      }),
    [record, setField],
  );

  const selectedModelNames = useMemo(
    () =>
      (draft.modelIds ?? [])
        .map((id) => modelsData?.items.find((m) => m.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [draft.modelIds, modelsData],
  );
  let modelRowValue: string | undefined;
  if (draft.brandId && selectedModelNames.length === 1) {
    modelRowValue = selectedModelNames[0];
  } else if (draft.brandId && selectedModelNames.length > 1) {
    modelRowValue = t("modelsSelected", { count: selectedModelNames.length });
  } else if (draft.brandId) {
    modelRowValue = t("allModels");
  }

  const close = (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11"
      onPress={() => setStep(null)}
      accessibilityLabel={t("close")}
    >
      <Icon as={X} className="size-5 text-foreground" />
    </Button>
  );

  return (
    <View className="gap-4">
      <PickerRow
        label={t("brand")}
        value={selectedBrand?.name}
        placeholder={t("selectBrand")}
        onPress={() => setStep({ step: "brand" })}
      />

      <PickerRow
        label={t("model")}
        value={modelRowValue}
        placeholder={t("selectModel")}
        disabled={!draft.brandId}
        onPress={() => {
          if (!draft.brandId) return;
          setStep({
            step: "model",
            brand: { id: draft.brandId, name: selectedBrand?.name ?? "" },
          });
        }}
      />

      <Sheet open={step !== null} onOpenChange={(open) => !open && setStep(null)}>
        <SheetContent
          className="px-0 pb-0"
          style={{ height: Math.min(screenHeight * 0.92, screenHeight - 48) }}
        >
          {step?.step === "brand" ? (
            <BrandPicker actions={actions} filters={draft} leading={close} />
          ) : step?.step === "model" ? (
            <ModelPicker
              key={step.brand.id}
              actions={actions}
              brandId={step.brand.id}
              brandName={step.brand.name || undefined}
              initialModelIds={step.brand.id === draft.brandId ? draft.modelIds : []}
              filters={draft}
              leading={close}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </View>
  );
}
