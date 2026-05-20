import { ChevronRight, Lock } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

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
        className={cn(
          "flex-row items-center justify-between rounded-lg border bg-background px-3.5",
          error ? "border-2 border-error" : "border border-gray-200",
          isDisabled && "opacity-50",
        )}
        style={{ height: 52 }}
      >
        <Text
          className={cn(
            "text-[17px] leading-snug",
            value ? "text-foreground" : "text-gray-400",
          )}
        >
          {value ?? placeholder}
        </Text>
        <Icon
          as={locked ? Lock : ChevronRight}
          className={cn(
            locked ? "size-4 text-gray-400" : "size-5 text-gray-400",
          )}
        />
      </Pressable>
      {locked && (
        <Text className="text-sm text-gray-500">
          This field cannot be changed after publishing.
        </Text>
      )}
      {!locked && helper && !error && (
        <Text className="text-sm text-gray-500">{helper}</Text>
      )}
      {error && (
        <Text className="text-sm font-medium text-error">{error}</Text>
      )}
    </View>
  );
}
