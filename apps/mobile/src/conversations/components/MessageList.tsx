import { useCallback } from "react";
import { FlatList, View } from "react-native";
import { useTranslation } from "react-i18next";

import { MessageBubble, type MessageStatus } from "./MessageBubble";

import { Text } from "@/components/ui/text";

export interface MessageItem {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: MessageStatus;
  deletedAt?: string | null;
  canDelete?: boolean;
}

interface MessageListProps {
  messages: MessageItem[];
  currentUserId: string;
  onRetry?: (tempId: string) => void;
  onDelete?: (messageId: string) => void;
  onReport?: (messageId: string) => void;
}

export function MessageList({ messages, currentUserId, onRetry, onDelete, onReport }: MessageListProps) {
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item }: { item: MessageItem }) => (
      <MessageBubble
        id={item.id}
        text={item.text}
        isMine={item.senderId === currentUserId}
        status={item.status}
        createdAt={item.createdAt}
        deletedAt={item.deletedAt}
        canDelete={item.canDelete}
        canReport={item.senderId !== currentUserId && !item.deletedAt}
        onRetry={item.status === "failed" ? () => onRetry?.(item.id) : undefined}
        onDelete={item.canDelete && !item.deletedAt ? () => onDelete?.(item.id) : undefined}
        onReport={item.senderId !== currentUserId && !item.deletedAt ? () => onReport?.(item.id) : undefined}
      />
    ),
    [currentUserId, onRetry, onDelete, onReport],
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
