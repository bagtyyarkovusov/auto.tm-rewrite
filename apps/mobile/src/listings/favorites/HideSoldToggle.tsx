import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface HideSoldToggleProps {
  hideSold: boolean;
  onChange: (hideSold: boolean) => void;
  /** Sold and removed-from-sale Favorites the switch is hiding; the line is absent at 0. */
  hiddenCount: number;
}

/**
 * The Hide sold switch at the top of Favorites. The whole row is one switch,
 * so the target is the full width and the state is announced. The track and
 * thumb mirror `components/ui/switch`, drawn here because that primitive is
 * not a row.
 */
export function HideSoldToggle({ hideSold, onChange, hiddenCount }: HideSoldToggleProps) {
  const { t } = useTranslation();
  return (
    <View className="border-b border-border">
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={t("hideSold")}
        accessibilityState={{ checked: hideSold }}
        onPress={() => onChange(!hideSold)}
        className="min-h-11 flex-row items-center justify-between px-4 py-2 active:bg-muted"
      >
        <Text className="text-base text-foreground">{t("hideSold")}</Text>
        <View
          className={cn(
            "h-6 w-10 flex-row items-center rounded-full px-0.5",
            hideSold ? "justify-end bg-foreground" : "justify-start bg-input dark:bg-input/80",
          )}
        >
          <View className={cn("size-5 rounded-full", hideSold ? "bg-background" : "bg-background dark:bg-foreground")} />
        </View>
      </Pressable>
      {hideSold && hiddenCount > 0 ? (
        <Text className="px-4 pb-2 text-xs text-muted-foreground">
          {t("favoritesHiddenCount", { count: hiddenCount })}
        </Text>
      ) : null}
    </View>
  );
}
