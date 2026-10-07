import { useTranslation } from "react-i18next";

import { useSafeBack } from "../../src/navigation/useSafeBack";
import { ConversationList } from "../../src/conversations/components/ConversationList";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { BackButton, StackHeader } from "@/components/navigation/StackHeader";

export default function ConversationsListScreen() {
  const { t } = useTranslation();
  const goBack = useSafeBack("/(tabs)/chat");

  return (
    <SafeScreen>
      <StackHeader
        large
        title={t("messages")}
        leading={<BackButton onPress={goBack} accessibilityLabel={t("goBack")} />}
      />

      <ConversationList />
    </SafeScreen>
  );
}
