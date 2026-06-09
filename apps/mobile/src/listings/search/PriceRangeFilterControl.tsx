import { useEffect } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

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
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{t("priceRange")}</Text>
      <View className="flex-row gap-3 items-start">
        <View className="flex-1 gap-1.5">
          <Input
            value={priceMin?.toString() ?? ""}
            onChangeText={handleMinChange}
            placeholder={t("min")}
            keyboardType="number-pad"
          />
          <Text className="text-xs text-muted-foreground">TMT</Text>
        </View>
        <View className="flex-1 gap-1.5">
          <Input
            value={priceMax?.toString() ?? ""}
            onChangeText={handleMaxChange}
            placeholder={t("max")}
            keyboardType="number-pad"
          />
          <Text className="text-xs text-muted-foreground">TMT</Text>
        </View>
      </View>
      {isInvalid && (
        <Text
          className="text-sm text-destructive"
          accessibilityLiveRegion="polite"
        >
          {t("minPriceExceedsMax")}
        </Text>
      )}
    </View>
  );
}
