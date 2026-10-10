import type { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../api/queryKeys";

import type {
  MessageDeletedEvent,
  MessageNewEvent,
  WatermarkEvent,
} from "./ConversationSocket";

type QueryClient = ReturnType<typeof useQueryClient>;

/**
 * Cache reactions to chat socket events, shared by the Conversation screen
 * hook and the app-wide listener. `message:new` also reaches sockets that
 * never joined the conversation room (the recipient's user room), so the list,
 * unread counts and by-ID Conversation refresh everywhere in the app. The
 * messages pages are patched only when that Conversation already has a cache:
 * the open screen's listener creates and owns it.
 */
export function handleMessageNew(
  queryClient: QueryClient,
  event: MessageNewEvent,
): void {
  const { message } = event;
  const conversationId = message.conversationId;

  queryClient.setQueryData(
    queryKeys.conversations.messages(conversationId),
    (old: { pages: Array<{ items: unknown[]; nextCursor: string | null }> } | undefined) => {
      if (!old) return old;

      const pages = old.pages.map((page, index) => {
        if (index !== 0) return page;
        const exists = page.items.some((item) => {
          const existing = item as { id?: string; clientMessageId?: string };
          if (existing.id === message.id) return true;
          if (
            message.clientMessageId &&
            existing.clientMessageId === message.clientMessageId
          ) {
            return true;
          }
          return false;
        });
        if (exists) return page;
        return { ...page, items: [message, ...page.items] };
      });

      return { ...old, pages };
    },
  );

  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.unreadCounts(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(conversationId),
  });
}

export function handleWatermark(
  queryClient: QueryClient,
  event: WatermarkEvent,
): void {
  // Another participant updated their watermark; refresh the conversation list
  // so unread counts and last-seen state reflect the change.
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.unreadCounts(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(event.conversationId),
  });
}

export function handleMessageDeleted(
  queryClient: QueryClient,
  event: MessageDeletedEvent,
): void {
  const { messageId, conversationId, deletedAt } = event;

  queryClient.setQueryData(
    queryKeys.conversations.messages(conversationId),
    (old: { pages: Array<{ items: unknown[]; nextCursor: string | null }> } | undefined) => {
      if (!old) return old;

      const pages = old.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => {
          const existing = item as {
            id?: string;
            deletedAt?: string;
            text?: string | null;
            metadata?: unknown;
          };
          if (existing.id !== messageId) return item;
          return {
            ...(item as Record<string, unknown>),
            deletedAt,
            text: null,
            metadata: undefined,
          };
        }),
      }));

      return { ...old, pages };
    },
  );

  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.unreadCounts(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(conversationId),
  });
}
