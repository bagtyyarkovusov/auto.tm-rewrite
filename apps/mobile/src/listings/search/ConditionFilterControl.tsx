import { Pressable, View } from "react-native";
import { Enums } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { FilterLabel } from "./FilterSection";

import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

type ConditionValue = Enums.ListingCondition | undefined;

interface ConditionFilterControlProps {
  value: ConditionValue;
  onChange: (value: ConditionValue) => void;
}

export function ConditionFilterControl({
  value,
  onChange,
}: ConditionFilterControlProps) {
  const { t } = useTranslation();

  const segments: { value: ConditionValue; label: string }[] = [
    { value: undefined, label: t("any") },
    { value: Enums.ListingCondition.New, label: t("new") },
    { value: Enums.ListingCondition.Used, label: t("used") },
  ];

  return (
    <View className="gap-2">
      <FilterLabel>{t("condition")}</FilterLabel>
      {/* The same segmented control as `ConditionSwitch` on Results. */}
      <View className="flex-row rounded-lg bg-secondary p-1">
        {segments.map((segment) => {
          const selected = value === segment.value;
          return (
            <Pressable
              key={segment.label}
              onPress={() => onChange(segment.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${segment.label} ${t("condition")}`}
              className={cn(
                "min-h-11 flex-1 items-center justify-center rounded-md px-2",
                selected && "bg-card",
                selected && "shadow-raised dark:bg-accent",
              )}
            >
              <Text
                className={cn(
                  "text-callout",
                  selected ? "font-semibold" : "font-medium",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
