import { View } from "react-native";
import { router } from "expo-router";
import { Search } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export function FeedEmpty() {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Icon as={Search} className="size-8 text-muted-foreground" />
      <View className="items-center gap-1">
        <Text className="text-base font-semibold text-foreground">
          No listings yet
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          Be the first to sell a car
        </Text>
      </View>
      <Button
        variant="brand"
        size="pill"
        onPress={() => router.push("/(tabs)/sell")}
      >
        <Text className="text-primary-foreground">Sell car</Text>
      </Button>
    </View>
  );
}
