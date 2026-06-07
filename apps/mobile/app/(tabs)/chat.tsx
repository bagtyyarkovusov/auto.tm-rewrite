import { MessageSquare } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "../../src/auth/useAuth";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { ConversationList } from "../../src/conversations/components/ConversationList";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

function AnonymousChatEntry() {
  const router = useRouter();

  const handleSignIn = () => {
    useAuthIntentStore.getState().setIntent({
      returnPath: "/(tabs)/chat",
    });
    router.push("/(auth)/phone");
  };

  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Icon as={MessageSquare} className="size-8 text-muted-foreground" />
      <Text className="text-base text-foreground">Sign in to see your messages</Text>
      <Button variant="brand" size="pill" onPress={handleSignIn}>
        <Text>Sign in</Text>
      </Button>
    </View>
  );
}

export default function ChatScreen() {
  const { isAuthenticated } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-semibold text-foreground">Messages</Text>
      </View>

      {isAuthenticated === false ? (
        <AnonymousChatEntry />
      ) : isAuthenticated === true ? (
        <ConversationList />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-muted-foreground">Loading…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
