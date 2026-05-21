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
        className={`flex-row items-center justify-between border border-border rounded-md bg-card px-3 h-[52px]${isDisabled ? " opacity-50" : ""}`}
      >
        <Text
          className={
            value ? "text-base text-foreground" : "text-base text-muted-foreground"
          }
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
        <Text className="text-sm text-destructive">{error}</Text>
      )}
    </View>
  );
}
