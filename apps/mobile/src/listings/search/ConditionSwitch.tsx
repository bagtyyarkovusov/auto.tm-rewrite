import type { Enums } from "@auto-tm/contracts";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * All, New or Used on Results. It is the same segmented control as the
 * condition filter in Search parameters (`ConditionFilterControl`): a tonal
 * track with 4 dp of padding, 44 dp segments whose 12 dp corners are
 * concentric with the track's 16 dp, and a raised thumb under the chosen
 * label. In dark the thumb is the lighter tone, so it still reads as raised.
 */
export function ConditionSwitch({ value, onChange }: { value?: Enums.ListingCondition; onChange: (value?: Enums.ListingCondition) => void }) {
  const { t } = useTranslation();
  const choices = [{ value: undefined, label: t("resultsAll") }, { value: "new" as const, label: t("new") }, { value: "used" as const, label: t("used") }];
  return <View className="flex-row rounded-lg bg-secondary p-1">
    {choices.map((choice) => {
      const selected = choice.value === value;
      return <Pressable key={choice.label} onPress={() => onChange(choice.value)} accessibilityRole="button"
        accessibilityLabel={`${choice.label} ${t("condition")}`} accessibilityState={{ selected }}
        className={cn("min-h-11 flex-1 items-center justify-center rounded-md px-2", selected && "bg-card shadow-raised dark:bg-accent")}>
        <Text className={cn("text-callout", selected ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}
          numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{choice.label}</Text>
      </Pressable>;
    })}
  </View>;
}
