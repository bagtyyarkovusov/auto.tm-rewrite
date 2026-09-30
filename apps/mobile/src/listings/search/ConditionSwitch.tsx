import type { Enums } from "@auto-tm/contracts";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export function ConditionSwitch({ value, onChange }: { value?: Enums.ListingCondition; onChange: (value?: Enums.ListingCondition) => void }) {
  const { t } = useTranslation();
  const choices = [{ value: undefined, label: t("resultsAll") }, { value: "new" as const, label: t("new") }, { value: "used" as const, label: t("used") }];
  return <View className="flex-row rounded-xl bg-muted p-1">
    {choices.map((choice) => <Pressable key={choice.label} onPress={() => onChange(choice.value)} accessibilityRole="button"
      accessibilityLabel={`${choice.label} ${t("condition")}`} accessibilityState={{ selected: choice.value === value }}
      className={cn("min-h-11 flex-1 items-center justify-center rounded-lg", choice.value === value && "bg-card")}>
      <Text className={cn("text-sm font-semibold", choice.value === value ? "text-foreground" : "text-muted-foreground")}>{choice.label}</Text>
    </Pressable>)}
  </View>;
}
