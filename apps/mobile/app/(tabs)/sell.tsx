import { PlusCircle } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export default function SellScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-4">
        <Icon as={PlusCircle} className="size-8 text-muted-foreground" />
        <Text className="mt-4 text-lg font-semibold text-foreground">
          Sell your car
        </Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          List your vehicle on AutoTM
        </Text>
        <Button className="mt-6" size="lg" variant="default">
          <Text>Start listing</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
