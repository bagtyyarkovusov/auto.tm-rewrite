import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ConversationsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { useAuth } from "../../src/auth/useAuth";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { useOpenConversation } from "../../src/api/conversations/useOpenConversation";
import { useSendPostRefMessage } from "../../src/api/conversations/useSendPostRefMessage";
import { useSafeBack } from "../../src/navigation/useSafeBack";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { ErrorState } from "@/components/ErrorState";

function generateClientMessageId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// apiClient types responses with the zod input side, so schema-defaulted
// fields (e.g. unreadCount) are optional here even though the parsed
// response always contains them.
type OpenedConversation = z.input<
  typeof ConversationsSchemas.OpenConversationResponseSchema
>;

export default function ShareListingScreen() {
  const { t } = useTranslation();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const goBack = useSafeBack("/(tabs)/chat");
  const { isAuthenticated } = useAuth();
  const openConversation = useOpenConversation();
  const sendPostRef = useSendPostRefMessage();
  const clientMessageId = useMemo(() => generateClientMessageId(), []);
  // One-shot guard for the auto-run effect below: the mutation objects get a
  // new identity every render, so without this the effect would re-fire and
  // resend. Retries go through handleRetry, not the effect, so the guard is
  // never reset.
  const sentRef = useRef(false);
  const [error, setError] = useState<unknown>(null);

  const navigateToConversation = useCallback(
    (conversation: OpenedConversation) => {
      const listing = conversation.listing;
      router.replace({
        pathname: "/conversations/[id]",
        params: {
          id: conversation.id,
          buyerId: conversation.buyerId,
          sellerId: conversation.sellerId,
          listingId: listing?.id ?? "",
          brandId: listing?.brandId ?? "",
          modelId: listing?.modelId ?? "",
          year: listing?.year ? String(listing.year) : "",
          displayPriceTmt: listing?.displayPriceTmt
            ? String(listing.displayPriceTmt)
            : "",
          priceCurrency: listing?.priceCurrency ?? "",
          coverMediaKey: listing?.coverMediaKey ?? "",
          status: listing?.status ?? "",
        },
      });
    },
    [router],
  );

  const sendReference = useCallback(
    (conversation: OpenedConversation) => {
      sendPostRef.mutate(
        {
          conversationId: conversation.id,
          listingId: listingId ?? "",
          clientMessageId,
        },
        {
          onSuccess: () => {
            navigateToConversation(conversation);
          },
          onError: (err) => {
            setError(err);
          },
        },
      );
    },
    [clientMessageId, listingId, navigateToConversation, sendPostRef],
  );

  const runShare = useCallback(() => {
    if (!listingId) return;
    setError(null);
    sentRef.current = true;

    openConversation.mutate(
      { listingId },
      {
        onSuccess: (conversation) => {
          sendReference(conversation);
        },
        onError: (err) => {
          setError(err);
        },
      },
    );
  }, [listingId, openConversation, sendReference]);

  useEffect(() => {
    if (!listingId || sentRef.current) {
      return;
    }

    if (isAuthenticated === false) {
      useAuthIntentStore.getState().setIntent({
        returnPath: `/conversations/share-listing?listingId=${listingId}`,
      });
      router.replace("/(auth)/phone");
      return;
    }

    if (isAuthenticated === true) {
      runShare();
    }
  }, [listingId, isAuthenticated, router, runShare]);

  const handleRetry = () => {
    runShare();
  };

  if (!listingId) {
    return (
      <SafeScreen>
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text className="text-lg font-semibold text-foreground">
            {t("listingInformationMissing")}
          </Text>
          <Button variant="ghost" onPress={goBack}>
            <Text>{t("goBack")}</Text>
          </Button>
        </View>
      </SafeScreen>
    );
  }

  if (error) {
    return (
      <SafeScreen>
        <ErrorState error={error} onRetry={handleRetry} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <ActivityIndicator />
        <Text className="text-sm text-muted-foreground text-center">
          {t("sendingToChat")}
        </Text>
      </View>
    </SafeScreen>
  );
}
