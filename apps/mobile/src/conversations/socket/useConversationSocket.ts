import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../api/queryKeys";

import {
  ConversationSocket,
  type ConversationSocketStatus,
  type MessageDeletedEvent,
  type MessageNewEvent,
  type SendTextMessageAck,
  type SocketErrorAck,
} from "./ConversationSocket";

let sharedSocket: ConversationSocket | null = null;

function getSharedSocket(): ConversationSocket {
  if (!sharedSocket) {
    sharedSocket = new ConversationSocket();
  }
  return sharedSocket;
}

export interface UseConversationSocketReturn {
  status: ConversationSocketStatus;
  isConnected: boolean;
  sendTextMessage: (input: {
    conversationId: string;
    text: string;
    clientMessageId: string;
  }) => Promise<SendTextMessageAck | SocketErrorAck>;
  deleteMessage: (input: {
    conversationId: string;
    messageId: string;
  }) => Promise<
    | { ok: true; messageId: string; conversationId: string; deletedAt: string }
    | { ok: false; code: string; message: string }
  >;
}

export function useConversationSocket(
  conversationId: string,
): UseConversationSocketReturn {
  const queryClient = useQueryClient();
  const socketRef = useRef(getSharedSocket());
  const joinedRef = useRef(false);
  const [status, setStatus] = useState<ConversationSocketStatus>(
    socketRef.current.getStatus(),
  );

  const isConnected = status === "connected";

  useEffect(() => {
    const socket = socketRef.current;

    void socket.connect();

    let previousStatus = socket.getStatus();
    const unsubscribeStatus = socket.subscribeStatus((next) => {
      setStatus(next);
      if (next === "connected" && !joinedRef.current) {
        void socket.joinConversation(conversationId).then((result) => {
          if (result.ok) {
            joinedRef.current = true;
          }
        });
      }
      if (next === "disconnected") {
        joinedRef.current = false;
      }
      if (
        previousStatus === "disconnected" &&
        next === "connected"
      ) {
        // HTTP recovery: reconcile any messages missed while disconnected.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages(conversationId),
        });
      }
      previousStatus = next;
    });

    const unsubscribeMessage = socket.subscribeMessage((event) => {
      handleMessageNew(queryClient, event);
    });

    const unsubscribeDeleted = socket.subscribeDeletedMessage((event) => {
      handleMessageDeleted(queryClient, event);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
      unsubscribeDeleted();
      void socket.leaveConversation(conversationId);
      joinedRef.current = false;
    };
  }, [conversationId, queryClient]);

  const sendTextMessage = useCallback(
    async (input: {
      conversationId: string;
      text: string;
      clientMessageId: string;
    }): Promise<SendTextMessageAck | SocketErrorAck> => {
      return socketRef.current.sendTextMessage(input);
    },
    [],
  );

  const deleteMessage = useCallback(
    async (input: {
      conversationId: string;
      messageId: string;
    }): Promise<
      | { ok: true; messageId: string; conversationId: string; deletedAt: string }
      | { ok: false; code: string; message: string }
    > => {
      return socketRef.current.deleteMessage(input);
    },
    [],
  );

  return { status, isConnected, sendTextMessage, deleteMessage };
}

function handleMessageNew(
  queryClient: ReturnType<typeof useQueryClient>,
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
}

function handleMessageDeleted(
  queryClient: ReturnType<typeof useQueryClient>,
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
}
