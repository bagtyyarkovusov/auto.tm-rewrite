import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { ConversationsSchemas } from "@auto-tm/contracts";

import { useViewer } from "../../src/auth/useViewer";
import { queryKeys } from "../../src/api/queryKeys";
import { useConversationMessages } from "../../src/api/conversations/useConversationMessages";
import { useSendTextMessage } from "../../src/api/conversations/useSendTextMessage";
import { useUpdateWatermark } from "../../src/api/conversations/useUpdateWatermark";
import { useDeleteMessage } from "../../src/api/conversations/useDeleteMessage";
import { useBrands } from "../../src/api/catalog/useBrands";
import { useModels } from "../../src/api/catalog/useModels";
import { useSafeBack } from "../../src/navigation/useSafeBack";
import { useConversationSocket } from "../../src/conversations/socket/useConversationSocket";
import { useBlockUser } from "../../src/api/identity/useBlockUser";
import { useUnblockUser } from "../../src/api/identity/useUnblockUser";
import { useIsBlocked } from "../../src/api/identity/useIsBlocked";
import { ConversationListingCard } from "../../src/conversations/components/ConversationListingCard";
import { MessageList } from "../../src/conversations/components/MessageList";
import { MessageComposer } from "../../src/conversations/components/MessageComposer";
import type { MessageStatus } from "../../src/conversations/components/MessageBubble";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { ErrorState } from "@/components/ErrorState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LocalMessage {
  id: string;
  clientMessageId: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: MessageStatus;
  deletedAt?: string | null;
  canDelete?: boolean;
}

function generateClientMessageId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type ConversationListData = {
  pages: Array<{
    items: ConversationsSchemas.ConversationSummary[];
    nextCursor: string | null;
  }>;
};

function findPeerWatermark(
  data: ConversationListData | undefined,
  conversationId: string,
): { peerLastReadAt?: string; peerLastDeliveredAt?: string } {
  const conversation = data?.pages
    .flatMap((page) => page.items)
    .find((item) => item.id === conversationId);

  return {
    peerLastReadAt: conversation?.peerLastReadAt,
    peerLastDeliveredAt: conversation?.peerLastDeliveredAt,
  };
}

function computeOutgoingStatus(
  messageCreatedAt: string,
  peerLastReadAt?: string,
  peerLastDeliveredAt?: string,
): Extract<MessageStatus, "sent" | "delivered" | "read"> {
  const created = new Date(messageCreatedAt).getTime();
  if (peerLastReadAt && new Date(peerLastReadAt).getTime() >= created) {
    return "read";
  }
  if (peerLastDeliveredAt && new Date(peerLastDeliveredAt).getTime() >= created) {
    return "delivered";
  }
  return "sent";
}

export default function ConversationDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const rawId = params.id;
  const conversationId = typeof rawId === "string" ? rawId : "";
  const viewer = useViewer();
  const goBack = useSafeBack("/(tabs)/chat");

  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const readMarkedRef = useRef(false);
  const [confirmAction, setConfirmAction] = useState<
    "block" | "unblock" | null
  >(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const messagesQuery = useConversationMessages({ conversationId });
  const sendHttpMessage = useSendTextMessage();
  const updateWatermark = useUpdateWatermark();
  const deleteHttpMessage = useDeleteMessage();
  const socket = useConversationSocket(conversationId, viewer?.userId);

  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  const listingCard = useMemo(() => {
    const listingId =
      typeof params.listingId === "string" ? params.listingId : undefined;
    if (!listingId) return null;
    return {
      id: listingId,
      brandId: typeof params.brandId === "string" ? params.brandId : "",
      modelId: typeof params.modelId === "string" ? params.modelId : "",
      year: typeof params.year === "string" ? Number(params.year) : undefined,
      displayPriceTmt:
        typeof params.displayPriceTmt === "string"
          ? Number(params.displayPriceTmt)
          : 0,
      priceCurrency:
        typeof params.priceCurrency === "string" ? params.priceCurrency : "TMT",
      coverMediaKey:
        typeof params.coverMediaKey === "string"
          ? params.coverMediaKey
          : undefined,
      status: typeof params.status === "string" ? params.status : "active",
    };
  }, [params]);

  const { data: brandsData } = useBrands();
  const { data: modelsData } = useModels(listingCard?.brandId ?? "");

  const brandName = useMemo(() => {
    if (!listingCard?.brandId) return undefined;
    return brandsData?.items.find((b) => b.id === listingCard.brandId)?.name;
  }, [brandsData, listingCard?.brandId]);

  const modelName = useMemo(() => {
    if (!listingCard?.modelId) return undefined;
    return modelsData?.items.find((m) => m.id === listingCard.modelId)?.name;
  }, [modelsData, listingCard?.modelId]);

  const { data: conversationsData } = useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: () =>
      queryClient.getQueryData<ConversationListData | undefined>(
        queryKeys.conversations.list(),
      ) ?? null,
    enabled: false,
  });

  const peerWatermark = useMemo(
    () => findPeerWatermark(conversationsData ?? undefined, conversationId),
    [conversationsData, conversationId],
  );

  const otherUserId = useMemo(() => {
    if (!viewer?.userId) return undefined;
    const buyerId = typeof params.buyerId === "string" ? params.buyerId : "";
    const sellerId =
      typeof params.sellerId === "string" ? params.sellerId : "";
    if (!buyerId || !sellerId) return undefined;
    return viewer.userId === buyerId ? sellerId : buyerId;
  }, [viewer?.userId, params.buyerId, params.sellerId]);

  const isBlockedQuery = useIsBlocked(otherUserId ?? "", {
    enabled: !!otherUserId,
  });

  const isBlocked = isBlockedQuery.data?.blocked ?? false;

  const handleBlock = useCallback(() => {
    if (!otherUserId) return;
    blockUser.mutate(
      { userId: otherUserId },
      {
        onSuccess: () => {
          setConfirmAction(null);
        },
      },
    );
  }, [blockUser, otherUserId]);

  const handleUnblock = useCallback(() => {
    if (!otherUserId) return;
    unblockUser.mutate(
      { userId: otherUserId },
      {
        onSuccess: () => {
          setConfirmAction(null);
        },
      },
    );
  }, [unblockUser, otherUserId]);

  const allMessages: LocalMessage[] = useMemo(() => {
    const { peerLastReadAt, peerLastDeliveredAt } = peerWatermark;
    const viewerId = viewer?.userId;
    const now = Date.now();
    const deleteWindowMs = 5 * 60 * 1000;

    const serverMessages: LocalMessage[] =
      messagesQuery.data?.pages.flatMap(
        (page) =>
          page.items.map((m) => ({
            id: m.id,
            clientMessageId: m.clientMessageId ?? m.id,
            senderId: m.senderId,
            text: m.text ?? "",
            createdAt: m.createdAt,
            status:
              m.senderId === viewerId
                ? computeOutgoingStatus(
                    m.createdAt,
                    peerLastReadAt,
                    peerLastDeliveredAt,
                  )
                : ("sent" as MessageStatus),
            deletedAt: m.deletedAt,
            canDelete:
              m.senderId === viewerId &&
              !m.deletedAt &&
              now - new Date(m.createdAt).getTime() <= deleteWindowMs,
          })),
      ) ?? [];

    const serverIds = new Set(serverMessages.map((m) => m.id));
    const serverClientIds = new Set(
      serverMessages.map((m) => m.clientMessageId).filter(Boolean),
    );
    const pendingOrFailed = localMessages.filter(
      (lm) =>
        lm.status !== "sent" &&
        lm.status !== "delivered" &&
        lm.status !== "read" &&
        !serverIds.has(lm.id) &&
        !serverClientIds.has(lm.clientMessageId),
    );

    return [...serverMessages, ...pendingOrFailed].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [messagesQuery.data, localMessages, peerWatermark, viewer?.userId]);

  const markRead = useCallback(
    async (timestamp = new Date().toISOString()) => {
      if (!viewer?.userId || !conversationId || readMarkedRef.current) return;
      readMarkedRef.current = true;

      const result = await socket.markRead(conversationId, timestamp);
      if (!result.ok) {
        // Fallback to HTTP if socket is not connected.
        updateWatermark.mutate({
          conversationId,
          lastReadAt: timestamp,
        });
      }
    },
    [conversationId, socket, updateWatermark, viewer?.userId],
  );

  // Mark conversation read once messages have loaded and the user is viewing it.
  useEffect(() => {
    if (
      !messagesQuery.isPending &&
      !messagesQuery.isError &&
      viewer?.userId &&
      conversationId &&
      !readMarkedRef.current
    ) {
      void markRead();
    }
  }, [
    messagesQuery.isPending,
    messagesQuery.isError,
    viewer?.userId,
    conversationId,
    markRead,
  ]);

  const markConfirmed = useCallback((clientMessageId: string, serverId: string) => {
    setLocalMessages((prev) =>
      prev.map((m) =>
        m.clientMessageId === clientMessageId
          ? { ...m, id: serverId, status: "sent" }
          : m,
      ),
    );
  }, []);

  const markFailed = useCallback((clientMessageId: string) => {
    setLocalMessages((prev) =>
      prev.map((m) =>
        m.clientMessageId === clientMessageId ? { ...m, status: "failed" } : m,
      ),
    );
  }, []);

  const sendViaHttp = useCallback(
    (clientMessageId: string, text: string) => {
      sendHttpMessage.mutate(
        { conversationId, text },
        {
          onSuccess: (data) => {
            markConfirmed(clientMessageId, data.id);
          },
          onError: () => {
            markFailed(clientMessageId);
          },
        },
      );
    },
    [conversationId, markConfirmed, markFailed, sendHttpMessage],
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!viewer?.userId || !conversationId || isBlocked) return;

      const clientMessageId = generateClientMessageId();
      const tempId = `pending-${clientMessageId}`;
      const pendingMessage: LocalMessage = {
        id: tempId,
        clientMessageId,
        senderId: viewer.userId,
        text,
        createdAt: new Date().toISOString(),
        status: "pending",
        canDelete: false,
      };

      setLocalMessages((prev) => [...prev, pendingMessage]);

      const result = await socket.sendTextMessage({
        conversationId,
        text,
        clientMessageId,
      });

      if (result.ok) {
        markConfirmed(clientMessageId, result.message.id);
      } else if (result.code === "NOT_CONNECTED") {
        sendViaHttp(clientMessageId, text);
      } else {
        markFailed(clientMessageId);
      }
    },
    [
      conversationId,
      isBlocked,
      markConfirmed,
      markFailed,
      sendViaHttp,
      socket,
      viewer?.userId,
    ],
  );

  const handleRetry = useCallback(
    async (tempId: string) => {
      if (!conversationId || isBlocked) return;
      const msg = localMessages.find((m) => m.id === tempId);
      if (!msg || msg.status !== "failed") return;

      setLocalMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "pending" } : m)),
      );

      const result = await socket.sendTextMessage({
        conversationId,
        text: msg.text,
        clientMessageId: msg.clientMessageId,
      });

      if (result.ok) {
        markConfirmed(msg.clientMessageId, result.message.id);
      } else if (result.code === "NOT_CONNECTED") {
        sendViaHttp(msg.clientMessageId, msg.text);
      } else {
        markFailed(msg.clientMessageId);
      }
    }, [conversationId, isBlocked, localMessages, markConfirmed, markFailed, sendViaHttp, socket],
  );

  const deleteViaHttp = useCallback(
    (messageId: string) => {
      deleteHttpMessage.mutate({ conversationId, messageId });
    },
    [conversationId, deleteHttpMessage],
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      if (!conversationId || !viewer?.userId) return;
      setMessageToDelete(null);

      const result = await socket.deleteMessage({
        conversationId,
        messageId,
      });

      if (!result.ok) {
        deleteViaHttp(messageId);
      }
    },
    [conversationId, deleteViaHttp, socket, viewer?.userId],
  );

  const confirmDeleteMessage = useCallback((messageId: string) => {
    setMessageToDelete(messageId);
  }, []);

  const cancelDelete = useCallback(() => {
    setMessageToDelete(null);
  }, []);

  const isLoading = messagesQuery.isPending;
  const isError = messagesQuery.isError;

  const confirmDialogOpen = confirmAction !== null;
  const confirmTitle =
    confirmAction === "block"
      ? t("blockUserConfirmTitle")
      : t("unblockUserConfirmTitle");
  const confirmDescription =
    confirmAction === "block"
      ? t("blockUserConfirmDescription")
      : t("unblockUserConfirmDescription");
  const confirmActionLabel =
    confirmAction === "block"
      ? t("blockUserConfirmAction")
      : t("unblockUserConfirmAction");
  const onConfirm = confirmAction === "block" ? handleBlock : handleUnblock;

  return (
    <SafeScreen>
      {/* Header */}
      <View className="flex-row items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-2 flex-1">
          <Button
            variant="ghost"
            className="h-11 w-11"
            size="icon"
            onPress={goBack}
            accessibilityLabel={t("goBack")}
          >
            <Icon as={ArrowLeft} className="size-5 text-foreground" />
          </Button>
          <Text
            className="text-lg font-semibold text-foreground"
            numberOfLines={1}
          >
            {t("messages")}
          </Text>
        </View>

        {otherUserId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 w-11"
                size="icon"
                accessibilityLabel={t("details")}
              >
                <Icon as={MoreVertical} className="size-5 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isBlocked ? (
                <DropdownMenuItem onPress={() => setConfirmAction("unblock")}>
                  {t("unblockUser")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onPress={() => setConfirmAction("block")}>
                  {t("blockUser")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </View>

      {/* Listing card */}
      {listingCard && (
        <ConversationListingCard
          listing={listingCard}
          brandName={brandName}
          modelName={modelName}
        />
      )}

      {/* Messages */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 px-4 py-4 gap-3">
            <View className="flex-row justify-end">
              <Skeleton className="h-10 w-2/3 rounded-2xl" />
            </View>
            <View className="flex-row justify-start">
              <Skeleton className="h-10 w-1/2 rounded-2xl" />
            </View>
            <View className="flex-row justify-end">
              <Skeleton className="h-10 w-3/5 rounded-2xl" />
            </View>
          </View>
        ) : isError ? (
          <ErrorState
            error={messagesQuery.error}
            onRetry={() => messagesQuery.refetch()}
          />
        ) : viewer?.userId ? (
          <MessageList
            messages={allMessages}
            currentUserId={viewer.userId}
            onRetry={handleRetry}
            onDelete={confirmDeleteMessage}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-sm text-muted-foreground">
              {t("signInToViewMessages")}
            </Text>
          </View>
        )}
      </View>

      {/* Blocked state banner */}
      {isBlocked && (
        <View className="px-4 py-3 border-t border-border bg-muted">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">
                {t("blockedStateTitle")}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t("blockedStateDescription")}
              </Text>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setConfirmAction("unblock")}
              disabled={unblockUser.isPending}
            >
              {t("blockedStateUnblock")}
            </Button>
          </View>
        </View>
      )}

      {/* Composer */}
      {viewer?.userId && (
        <MessageComposer
          onSend={handleSend}
          disabled={isBlocked || blockUser.isPending || unblockUser.isPending}
          showQuickReplies={
            !isLoading && !isError && !isBlocked && allMessages.length === 0
          }
        />
      )}

      {/* Block / Unblock confirmation */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setConfirmAction(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={onConfirm}
              disabled={blockUser.isPending || unblockUser.isPending}
            >
              {confirmActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete message confirmation */}
      <AlertDialog open={!!messageToDelete} onOpenChange={cancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteMessageTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteMessageDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={cancelDelete}>
              <Text>{t("cancel")}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() =>
                messageToDelete && handleDelete(messageToDelete)
              }
            >
              <Text>{t("delete")}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeScreen>
  );
}
