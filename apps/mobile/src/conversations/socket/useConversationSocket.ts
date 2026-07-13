import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../api/queryKeys";

import {
  ConversationSocket,
  type ConversationSocketStatus,
  type MessageDeletedEvent,
  type MessageNewEvent,
  type PresenceEvent,
  type SendTextMessageAck,
  type SocketErrorAck,
  type TypingEvent,
  type WatermarkEvent,
} from "./ConversationSocket";

let sharedSocket: ConversationSocket | null = null;

function getSharedSocket(): ConversationSocket {
  if (!sharedSocket) {
    sharedSocket = new ConversationSocket();
  }
  return sharedSocket;
}

const TYPING_DEBOUNCE_MS = 3000;
const PEER_TYPING_TIMEOUT_MS = 5000;

export interface PeerPresence {
  userId?: string;
  online: boolean;
  lastSeenAt?: string;
}

export interface UseConversationSocketReturn {
  status: ConversationSocketStatus;
  isConnected: boolean;
  peerTyping: boolean;
  peerPresence: PeerPresence;
  sendTextMessage: (input: {
    conversationId: string;
    text: string;
    clientMessageId: string;
  }) => Promise<SendTextMessageAck | SocketErrorAck>;
  signalTyping: () => void;
  stopTyping: () => void;
  markDelivered: (conversationId: string, timestamp?: string) => Promise<SocketErrorAck | { ok: true; conversationId: string }>;
  markRead: (conversationId: string, timestamp?: string) => Promise<SocketErrorAck | { ok: true; conversationId: string }>;
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
  currentUserId?: string,
): UseConversationSocketReturn {
  const queryClient = useQueryClient();
  const socketRef = useRef(getSharedSocket());
  const joinedRef = useRef(false);
  const [status, setStatus] = useState<ConversationSocketStatus>(
    socketRef.current.getStatus(),
  );
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerPresence, setPeerPresence] = useState<PeerPresence>({
    online: false,
  });

  const typingStartSentRef = useRef(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnected = status === "connected";

  const signalTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!isConnected || !joinedRef.current) return;

    if (!typingStartSentRef.current) {
      typingStartSentRef.current = true;
      void socket.sendTypingStart(conversationId);
    }

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      typingStopTimerRef.current = null;
      if (typingStartSentRef.current) {
        typingStartSentRef.current = false;
        void socket.sendTypingStop(conversationId);
      }
    }, TYPING_DEBOUNCE_MS);
  }, [conversationId, isConnected]);

  const stopTyping = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    if (typingStartSentRef.current) {
      typingStartSentRef.current = false;
      void socketRef.current.sendTypingStop(conversationId);
    }
  }, [conversationId]);

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
        // Best-effort cleanup of any in-flight typing state.
        if (typingStartSentRef.current) {
          typingStartSentRef.current = false;
        }
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
      if (event.message.conversationId !== conversationId) {
        return;
      }

      handleMessageNew(queryClient, event);
      if (currentUserId && event.message.senderId !== currentUserId) {
        void socket.markDelivered(
          event.message.conversationId,
          new Date().toISOString(),
        );
      }
    });

    const unsubscribeWatermark = socket.subscribeWatermark((event) => {
      handleWatermark(queryClient, event);
    });

    const unsubscribeDeleted = socket.subscribeDeletedMessage((event) => {
      handleMessageDeleted(queryClient, event);
    });

    const unsubscribeTyping = socket.subscribeTyping((event: TypingEvent) => {
      if (event.conversationId !== conversationId) return;
      if (currentUserId && event.userId === currentUserId) return;

      setPeerTyping(event.isTyping);

      if (event.isTyping) {
        if (peerTypingTimerRef.current) {
          clearTimeout(peerTypingTimerRef.current);
        }
        peerTypingTimerRef.current = setTimeout(() => {
          peerTypingTimerRef.current = null;
          setPeerTyping(false);
        }, PEER_TYPING_TIMEOUT_MS);
      } else if (peerTypingTimerRef.current) {
        clearTimeout(peerTypingTimerRef.current);
        peerTypingTimerRef.current = null;
      }
    });

    const unsubscribePresence = socket.subscribePresence((event: PresenceEvent) => {
      if (event.conversationId !== conversationId) return;
      if (currentUserId && event.userId === currentUserId) return;

      setPeerPresence({
        userId: event.userId,
        online: event.online,
        lastSeenAt: event.lastSeenAt,
      });
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
      unsubscribeWatermark();
      unsubscribeDeleted();
      unsubscribeTyping();
      unsubscribePresence();
      stopTyping();
      void socket.leaveConversation(conversationId);
      joinedRef.current = false;
    };
  }, [conversationId, currentUserId, queryClient, stopTyping]);

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

  const markDelivered = useCallback(
    async (id: string, timestamp = new Date().toISOString()) => {
      return socketRef.current.markDelivered(id, timestamp);
    },
    [],
  );

  const markRead = useCallback(
    async (id: string, timestamp = new Date().toISOString()) => {
      return socketRef.current.markConversationRead(id, timestamp);
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

  return { status, isConnected, peerTyping, peerPresence, sendTextMessage, signalTyping, stopTyping, markDelivered, markRead, deleteMessage };
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

function handleWatermark(
  queryClient: ReturnType<typeof useQueryClient>,
  event: WatermarkEvent,
): void {
  // Another participant updated their watermark; refresh the conversation list
  // so unread counts and last-seen state reflect the change.
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(event.conversationId),
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
