import { Heart } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export default function FavoritesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-semibold text-foreground">
          Favorites
        </Text>
      </View>
      <View className="flex-1 items-center justify-center px-4">
        <Icon as={Heart} className="size-8 text-muted-foreground" />
        <Text className="mt-3 text-base text-muted-foreground">
          No favorites yet
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Save listings to find them later
        </Text>
      </View>
    </SafeAreaView>
  );
}
