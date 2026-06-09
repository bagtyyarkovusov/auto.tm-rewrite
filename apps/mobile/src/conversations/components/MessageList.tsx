import { useCallback } from "react";
import { FlatList, View } from "react-native";
import { useTranslation } from "react-i18next";

import { MessageBubble, type MessageStatus } from "./MessageBubble";

import { Text } from "@/components/ui/text";

interface MessageItem {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: MessageStatus;
}

interface MessageListProps {
  messages: MessageItem[];
  currentUserId: string;
  onRetry?: (tempId: string) => void;
}

export function MessageList({ messages, currentUserId, onRetry }: MessageListProps) {
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item }: { item: MessageItem }) => (
      <MessageBubble
        text={item.text}
        isMine={item.senderId === currentUserId}
        status={item.status}
        createdAt={item.createdAt}
        onRetry={item.status === "failed" ? () => onRetry?.(item.id) : undefined}
      />
    ),
    [currentUserId, onRetry],
  );

  const keyExtractor = useCallback((item: MessageItem) => item.id, []);

  return (
    <FlatList
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ paddingVertical: 8 }}
      inverted
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <View
          style={{ transform: [{ scaleY: -1 }] }}
          className="flex-1 items-center justify-center px-6 py-12"
        >
          <Text className="text-sm text-muted-foreground">
            {t("noMessagesYet")}
          </Text>
        </View>
      }
    />
  );
}
