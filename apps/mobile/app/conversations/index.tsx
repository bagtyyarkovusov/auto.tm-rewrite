import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { ConversationList } from "../../src/conversations/components/ConversationList";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export default function ConversationsListScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-2 px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Icon as={ArrowLeft} className="size-5 text-foreground" />
        </Button>
        <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
          Messages
        </Text>
      </View>

      <ConversationList />
    </SafeAreaView>
  );
}
