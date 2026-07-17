import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";

interface TypingIndicatorProps {
  visible: boolean;
}

export function TypingIndicator({ visible }: TypingIndicatorProps) {
  const { t } = useTranslation("conversations");

  return (
    <View className="h-6 justify-center px-4">
      {visible && (
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {t("peerTyping")}
        </Text>
      )}
    </View>
  );
}
