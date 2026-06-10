import { View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useSafeBack } from "../../src/navigation/useSafeBack";
import { ConversationList } from "../../src/conversations/components/ConversationList";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { SafeScreen } from "@/components/navigation/SafeScreen";

export default function ConversationsListScreen() {
  const { t } = useTranslation();
  const goBack = useSafeBack("/(tabs)/chat");

  return (
    <SafeScreen>
      {/* Header */}
      <View className="flex-row items-center gap-2 px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          className="h-11 w-11"
          size="icon"
          onPress={goBack}
          accessibilityLabel={t("goBack")}
        >
          <Icon as={ArrowLeft} className="size-5 text-foreground" />
        </Button>
        <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
          {t("messages")}
        </Text>
      </View>

      <ConversationList />
    </SafeScreen>
  );
}
