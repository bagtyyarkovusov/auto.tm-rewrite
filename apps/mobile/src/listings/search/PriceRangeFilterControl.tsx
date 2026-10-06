import { useEffect } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { FilterLabel, FilterRange } from "./FilterSection";

import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

interface PriceRangeFilterControlProps {
  priceMin?: number;
  priceMax?: number;
  setField: (key: "priceMin" | "priceMax", value: number | undefined) => void;
  onValidityChange?: (valid: boolean) => void;
}

export function PriceRangeFilterControl({
  priceMin,
  priceMax,
  setField,
  onValidityChange,
}: PriceRangeFilterControlProps) {
  const { t } = useTranslation();
  const isInvalid =
    priceMin !== undefined && priceMax !== undefined && priceMin > priceMax;

  useEffect(() => {
    onValidityChange?.(!isInvalid);
  }, [isInvalid, onValidityChange]);

  const handleMinChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    const num = digits === "" ? undefined : parseInt(digits, 10);
    setField("priceMin", num);
  };

  const handleMaxChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    const num = digits === "" ? undefined : parseInt(digits, 10);
    setField("priceMax", num);
  };

  return (
    <View className="gap-2">
      <FilterLabel>{t("priceRange")}</FilterLabel>
      <FilterRange>
        {/* The currency sits inside each field at its trailing edge, where the amount ends. */}
        <View className="min-w-0 flex-1 justify-center">
          <Input
            value={priceMin?.toString() ?? ""}
            onChangeText={handleMinChange}
            placeholder={t("min")}
            keyboardType="number-pad"
            className={isInvalid ? "border-destructive pr-14" : "pr-14"}
          />
          <Text pointerEvents="none" className="absolute right-4 text-footnote font-medium text-muted-foreground">TMT</Text>
        </View>
        <View className="min-w-0 flex-1 justify-center">
          <Input
            value={priceMax?.toString() ?? ""}
            onChangeText={handleMaxChange}
            placeholder={t("max")}
            keyboardType="number-pad"
            className={isInvalid ? "border-destructive pr-14" : "pr-14"}
          />
          <Text pointerEvents="none" className="absolute right-4 text-footnote font-medium text-muted-foreground">TMT</Text>
        </View>
      </FilterRange>
      {isInvalid && (
        <Text
          className="px-1 text-callout text-destructive"
          accessibilityLiveRegion="polite"
        >
          {t("minPriceExceedsMax")}
        </Text>
      )}
    </View>
  );
}
