import { Pressable, View } from "react-native";
import { Enums } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

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
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{t("condition")}</Text>
      <View className="flex-row rounded-lg bg-muted p-1">
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
                "flex-1 items-center justify-center rounded-md py-2.5",
                selected && "bg-card",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-medium",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
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
