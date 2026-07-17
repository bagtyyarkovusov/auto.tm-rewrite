import { ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export interface QuickReply {
  key: string;
  translationKey: string;
}

export const QUICK_REPLIES: QuickReply[] = [
  { key: "available", translationKey: "quickReplyAvailable" },
  { key: "seeIt", translationKey: "quickReplySeeIt" },
  { key: "finalPrice", translationKey: "quickReplyFinalPrice" },
  { key: "condition", translationKey: "quickReplyCondition" },
];

interface QuickRepliesProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ onSelect, disabled = false }: QuickRepliesProps) {
  const { t } = useTranslation("conversations");

  return (
    <View className="bg-background">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-2 px-4 py-3">
          {QUICK_REPLIES.map((reply) => (
            <Button
              key={reply.key}
              variant="secondary"
              size="sm"
              disabled={disabled}
              onPress={() => onSelect(t(reply.translationKey))}
              accessibilityLabel={t(reply.translationKey)}
            >
              <Text numberOfLines={1}>{t(reply.translationKey)}</Text>
            </Button>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
