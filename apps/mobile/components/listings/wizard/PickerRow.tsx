import { ChevronRight, Lock } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

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
  /**
   * Draws the row for a grouped list: the label at the leading edge, the
   * value at the trailing edge, and no surface of its own, because the group
   * (`GroupedList`) is the surface. The default is a labelled field that
   * stands alone on the page.
   */
  grouped?: boolean;
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
  grouped = false,
}: PickerRowProps) {
  const { t } = useTranslation();
  const isDisabled = disabled || locked;
  const shownDetail = value ? detail : undefined;
  const accessibilityLabel = `${label}: ${value ?? placeholder}${shownDetail ? `, ${shownDetail}` : ""}`;

  if (grouped) {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        accessibilityLabel={accessibilityLabel}
        className={cn(
          "min-h-14 flex-row items-center gap-3 px-4 py-2 active:bg-secondary",
          isDisabled && "opacity-50",
        )}
      >
        <Text className="shrink-0 text-body text-foreground" numberOfLines={1}>
          {label}
          {required ? " *" : ""}
        </Text>
        {/* The value takes the room the label leaves and ends at the chevron. */}
        <Text
          className={cn(
            "min-w-0 flex-1 text-right text-body",
            value ? "font-medium text-foreground" : "text-muted-foreground",
          )}
          numberOfLines={1}
        >
          {value ?? placeholder}
        </Text>
        <Icon
          as={locked ? Lock : ChevronRight}
          className="size-4 text-muted-foreground"
        />
      </Pressable>
    );
  }

  return (
    <View className="gap-2">
      <Text className="text-callout font-medium text-foreground">
        {label}
        {required ? " *" : ""}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        accessibilityLabel={accessibilityLabel}
        className={`flex-row items-center justify-between rounded-lg bg-card px-4 h-control-md active:bg-secondary ${isDisabled ? " opacity-50" : ""}`}
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
        <Text className="text-footnote text-destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}
