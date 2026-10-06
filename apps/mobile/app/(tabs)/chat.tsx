import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../src/auth/useAuth";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { ConversationList } from "../../src/conversations/components/ConversationList";
import { useChatPushTokenRegistration } from "../../src/notifications/useChatPushTokenRegistration";
import { LargeTitle } from "../../components/navigation/ScreenHeader";
import { TabScreen } from "../../components/navigation/TabScreen";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Text } from "@/components/ui/text";

function AnonymousChatEntry() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSignIn = () => {
    useAuthIntentStore.getState().requireSignIn(router, {
      returnTo: "/(tabs)/chat",
    });
  };

  return (
    <EmptyState illustration="messages" title={t("messagesSignedOutTitle")}>
      <Button variant="brand" size="pill" onPress={handleSignIn}>
        <Text>{t("signIn")}</Text>
      </Button>
    </EmptyState>
  );
}

function ChatContent({ isAuthenticated }: { isAuthenticated: boolean | null }) {
  const { t } = useTranslation();

  useChatPushTokenRegistration(isAuthenticated === true);

  if (isAuthenticated === false) {
    return <AnonymousChatEntry />;
  }

  if (isAuthenticated === true) {
    return <ConversationList />;
  }

  return (
    <View className="flex-1 items-center justify-center gap-3">
      <ActivityIndicator />
      <Text className="text-callout text-muted-foreground">{t("loading")}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <TabScreen>
      <LargeTitle title={t("messages")} />

      <ChatContent isAuthenticated={isAuthenticated} />
    </TabScreen>
  );
}
