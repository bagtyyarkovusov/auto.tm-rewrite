import type { LucideIcon } from "lucide-react-native";
import { Pressable } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** A plain menu row: icon, label and the current value. Opens its picker when pressed. */
export function PickerRow({ icon, label, value, onPress }: {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      className="min-h-14 flex-row items-center gap-3.5 py-2 active:opacity-70"
      onPress={onPress}
    >
      <Icon as={icon} className="size-6 text-muted-foreground" />
      <Text className="flex-1 text-base text-foreground">{label}</Text>
      <Text className="text-[15px] text-muted-foreground">{value}</Text>
    </Pressable>
  );
}
