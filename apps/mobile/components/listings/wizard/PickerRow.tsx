import { ChevronRight, Lock } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface PickerRowProps {
  label: string;
  value?: string;
  /** Muted text after the value, such as a city's region. */
  detail?: string;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helper?: string;
  onPress: () => void;
  locked?: boolean;
}

export function PickerRow({
  label,
  value,
  detail,
  placeholder,
  disabled,
  required,
  error,
  helper,
  onPress,
  locked,
}: PickerRowProps) {
  const { t } = useTranslation();
  const isDisabled = disabled || locked;
  const shownDetail = value ? detail : undefined;

  return (
    <View className="gap-1.5">
      <Text className="text-callout font-medium text-foreground">
        {label}
        {required ? " *" : ""}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        accessibilityLabel={`${label}: ${value ?? placeholder}${shownDetail ? `, ${shownDetail}` : ""}`}
        className={`flex-row items-center justify-between border border-border rounded-lg bg-card px-4 h-[52px] active:bg-muted/60 ${isDisabled ? " opacity-50" : ""}`}
      >
        <View className="flex-1 flex-row items-baseline gap-2 pr-2">
          <Text
            className={
              value ? "shrink text-body text-foreground font-medium" : "shrink text-body text-muted-foreground"
            }
            numberOfLines={1}
          >
            {value ?? placeholder}
          </Text>
          {shownDetail && (
            <Text className="shrink text-callout text-muted-foreground" numberOfLines={1}>
              {shownDetail}
            </Text>
          )}
        </View>
        <Icon
          as={locked ? Lock : ChevronRight}
          className={
            locked ? "size-4 text-muted-foreground" : "size-5 text-muted-foreground"
          }
        />
      </Pressable>
      {locked && (
        <Text className="text-callout text-muted-foreground">
          {t("thisFieldCannotBeChanged")}
        </Text>
      )}
      {!locked && helper && !error && (
        <Text className="text-callout text-muted-foreground">{helper}</Text>
      )}
      {error && (
        <Text className="text-callout text-destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}
