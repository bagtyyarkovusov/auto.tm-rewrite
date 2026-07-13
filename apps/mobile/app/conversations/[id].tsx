import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useViewer } from "../../src/auth/useViewer";
import { useConversationMessages } from "../../src/api/conversations/useConversationMessages";
import { useSendTextMessage } from "../../src/api/conversations/useSendTextMessage";
import { useDeleteMessage } from "../../src/api/conversations/useDeleteMessage";
import { useBrands } from "../../src/api/catalog/useBrands";
import { useModels } from "../../src/api/catalog/useModels";
import { useSafeBack } from "../../src/navigation/useSafeBack";
import { useConversationSocket } from "../../src/conversations/socket/useConversationSocket";
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
}

function generateClientMessageId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ConversationDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const rawId = params.id;
  const conversationId = typeof rawId === "string" ? rawId : "";
  const viewer = useViewer();
  const goBack = useSafeBack("/(tabs)/chat");

  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const messagesQuery = useConversationMessages({ conversationId });
  const sendHttpMessage = useSendTextMessage();
  const deleteHttpMessage = useDeleteMessage();
  const socket = useConversationSocket(conversationId);

  const listingCard = useMemo(() => {
    const listingId =
      typeof params.listingId === "string" ? params.listingId : undefined;
    if (!listingId) return null;
    return {
      id: listingId,
      brandId:
        typeof params.brandId === "string" ? params.brandId : "",
      modelId:
        typeof params.modelId === "string" ? params.modelId : "",
      year: typeof params.year === "string" ? Number(params.year) : undefined,
      displayPriceTmt:
        typeof params.displayPriceTmt === "string"
          ? Number(params.displayPriceTmt)
          : 0,
      priceCurrency:
        typeof params.priceCurrency === "string"
          ? params.priceCurrency
          : "TMT",
      coverMediaKey:
        typeof params.coverMediaKey === "string"
          ? params.coverMediaKey
          : undefined,
      status:
        typeof params.status === "string" ? params.status : "active",
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

  const allMessages: LocalMessage[] = useMemo(() => {
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
            status: "confirmed" as MessageStatus,
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
        lm.status !== "confirmed" &&
        !serverIds.has(lm.id) &&
        !serverClientIds.has(lm.clientMessageId),
    );

    return [...serverMessages, ...pendingOrFailed].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [messagesQuery.data, localMessages, viewer?.userId]);

  const markConfirmed = useCallback((clientMessageId: string, serverId: string) => {
    setLocalMessages((prev) =>
      prev.map((m) =>
        m.clientMessageId === clientMessageId
          ? { ...m, id: serverId, status: "confirmed" }
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
      if (!viewer?.userId || !conversationId) return;

      const clientMessageId = generateClientMessageId();
      const tempId = `pending-${clientMessageId}`;
      const pendingMessage: LocalMessage = {
        id: tempId,
        clientMessageId,
        senderId: viewer.userId,
        text,
        createdAt: new Date().toISOString(),
        status: "pending",
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
    [conversationId, markConfirmed, markFailed, sendViaHttp, socket, viewer?.userId],
  );

  const handleRetry = useCallback(
    async (tempId: string) => {
      if (!conversationId) return;
      const msg = localMessages.find((m) => m.id === tempId);
      if (!msg || msg.status !== "failed") return;

      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: "pending" } : m,
        ),
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
    },
    [conversationId, localMessages, markConfirmed, markFailed, sendViaHttp, socket],
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
        <Text
          className="text-lg font-semibold text-foreground"
          numberOfLines={1}
        >
          {t("messages")}
        </Text>
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

      {/* Composer */}
      {viewer?.userId && (
        <MessageComposer
          onSend={handleSend}
          disabled={false}
        />
      )}

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
