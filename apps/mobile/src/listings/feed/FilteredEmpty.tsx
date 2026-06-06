import { View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface FilteredEmptyProps {
  onReset: () => void;
}

export function FilteredEmpty({ onReset }: FilteredEmptyProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Icon as={SlidersHorizontal} className="size-8 text-muted-foreground" />
      <View className="items-center gap-1">
        <Text className="text-base font-semibold text-foreground">
          No listings match
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          Try adjusting filters
        </Text>
      </View>
      <Button variant="brand" size="pill" onPress={onReset}>
        <Text className="text-primary-foreground">Reset filters</Text>
      </Button>
    </View>
  );
}
