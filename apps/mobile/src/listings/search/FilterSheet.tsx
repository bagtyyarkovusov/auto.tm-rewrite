import { useState } from "react";
import { X } from "lucide-react-native";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import type { UseListingFiltersReturn } from "./useListingFilters";
import { BrandModelFilterControl } from "./BrandModelFilterControl";
import { CityFilterControl } from "./CityFilterControl";
import { ConditionFilterControl } from "./ConditionFilterControl";
import { PriceRangeFilterControl } from "./PriceRangeFilterControl";
import { YearRangeFilterControl } from "./YearRangeFilterControl";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: UseListingFiltersReturn;
}

export function FilterSheet({ open, onOpenChange, filters }: FilterSheetProps) {
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const { draft, setField, apply, reset, count, isValid } = filters;
  const [priceRangeValid, setPriceRangeValid] = useState(true);
  const isApplyDisabled = !isValid || !priceRangeValid;
  const applyLabel =
    count > 0 ? t("applyFiltersCount", { count }) : t("apply");

  const handleApply = () => {
    apply();
    onOpenChange(false);
  };

  const handleReset = () => {
    reset();
  };

  const sheetHeight = Math.min(screenHeight * 0.85, screenHeight - 80);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent style={{ height: sheetHeight }}>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>{t("filterSheetTitle")}</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => onOpenChange(false)}
            accessibilityLabel={t("close")}
          >
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
        </SheetHeader>

        <ScrollView
          className="min-h-0 flex-1"
          contentContainerClassName="gap-4 pb-2"
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical={true}
          nestedScrollEnabled={true}
        >
          <ConditionFilterControl
            value={draft.condition}
            onChange={(value) => setField("condition", value)}
          />
          <CityFilterControl draft={filters.draft} setField={filters.setField} />
          <BrandModelFilterControl
            draft={filters.draft}
            setField={filters.setField}
          />
          <YearRangeFilterControl draft={filters.draft} setField={filters.setField} />
          <PriceRangeFilterControl
            priceMin={draft.priceMin}
            priceMax={draft.priceMax}
            setField={setField}
            onValidityChange={setPriceRangeValid}
          />
        </ScrollView>

        {isApplyDisabled && (
          <Text className="px-1 pb-2 text-xs text-destructive">
            {t("checkFilterValues")}
          </Text>
        )}

        <View className="flex-row gap-3 pt-2">
          <Button
            variant="ghost"
            size="lg"
            className="flex-1"
            onPress={handleReset}
            accessibilityLabel={t("resetAll")}
          >
            <Text>{t("resetAll")}</Text>
          </Button>
          <Button
            variant="brand"
            size="pill"
            className="flex-1"
            onPress={handleApply}
            disabled={isApplyDisabled}
            accessibilityLabel={applyLabel}
          >
            <Text>{applyLabel}</Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}
