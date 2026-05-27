import { ChevronRight, Lock } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface PickerRowProps {
  label: string;
  value?: string;
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
  placeholder,
  disabled,
  required,
  error,
  helper,
  onPress,
  locked,
}: PickerRowProps) {
  const isDisabled = disabled || locked;

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">
        {label}
        {required ? " *" : ""}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        className={`flex-row items-center justify-between border border-border rounded-lg bg-card px-4 h-[52px] active:bg-muted/60 ${isDisabled ? " opacity-50" : ""}`}
      >
        <Text
          className={
            value ? "text-base text-foreground font-medium" : "text-base text-muted-foreground"
          }
          numberOfLines={1}
        >
          {value ?? placeholder}
        </Text>
        <Icon
          as={locked ? Lock : ChevronRight}
          className={
            locked ? "size-4 text-muted-foreground" : "size-5 text-muted-foreground"
          }
        />
      </Pressable>
      {locked && (
        <Text className="text-sm text-muted-foreground">
          This field cannot be changed after publishing.
        </Text>
      )}
      {!locked && helper && !error && (
        <Text className="text-sm text-muted-foreground">{helper}</Text>
      )}
      {error && (
        <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}
