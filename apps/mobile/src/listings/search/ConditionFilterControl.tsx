import { Pressable, View } from "react-native";
import { Enums } from "@auto-tm/contracts";

import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

type ConditionValue = Enums.ListingCondition | undefined;

interface ConditionFilterControlProps {
  value: ConditionValue;
  onChange: (value: ConditionValue) => void;
}

const SEGMENTS: { value: ConditionValue; label: string }[] = [
  { value: undefined, label: "Any" },
  { value: Enums.ListingCondition.New, label: "New" },
  { value: Enums.ListingCondition.Used, label: "Used" },
];

export function ConditionFilterControl({
  value,
  onChange,
}: ConditionFilterControlProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Condition</Text>
      <View className="flex-row rounded-lg bg-muted p-1">
        {SEGMENTS.map((segment) => {
          const selected = value === segment.value;
          return (
            <Pressable
              key={segment.label}
              onPress={() => onChange(segment.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${segment.label} condition`}
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
