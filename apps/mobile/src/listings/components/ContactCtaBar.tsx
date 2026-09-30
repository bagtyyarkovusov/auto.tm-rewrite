import { View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Phone, MessageCircle } from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/useAuth";
import {
  useAuthIntentStore,
  useReplayAuthAction,
} from "../../auth/intentStore";
import { useOpenConversation } from "../../api/conversations/useOpenConversation";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface ContactCtaBarProps {
  listingId: string;
  contactPhone?: string;
  allowCalls: boolean;
  allowChat: boolean;
  status: Enums.ListingStatus;
}

export function ContactCtaBar({
  listingId,
  contactPhone,
  allowCalls,
  allowChat,
  status,
}: ContactCtaBarProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const openConversation = useOpenConversation();
  const { t } = useTranslation();
  const listingHref = `/(public)/listings/${listingId}` as const;
  const isSold = status === Enums.ListingStatus.Sold;
  const isArchived = status === Enums.ListingStatus.Archived;
  const canCall = allowCalls && !!contactPhone && !isSold && !isArchived;
  const canMessage = allowChat && !isSold && !isArchived;

  const handleCall = async () => {
    if (!canCall || !contactPhone) return;
    const url = `tel:${contactPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  // `openListingConversation` is the action body without the auth gate, so one
  // code path serves a signed-in tap and a pending action replayed after
  // sign-in. A replay must not re-check `isAuthenticated`: that
  // flag is refreshed asynchronously and is still false for a beat after the
  // session is stored, while the API client already reads the new token per
  // request.
  const openListingConversation = () => {
    openConversation.mutate(
      { listingId },
      {
        onSuccess: (data) => {
          const listing = data.listing;
          router.push({
            pathname: "/conversations/[id]",
            params: {
              id: data.id,
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
      },
    );
  };

  useReplayAuthAction("message", listingId, openListingConversation);

  const handleMessage = () => {
    if (!canMessage) return;

    if (isAuthenticated === false) {
      useAuthIntentStore.getState().requireSignIn(router, {
        returnTo: listingHref,
        action: { kind: "message", listingId },
      });
      return;
    }

    if (isAuthenticated === true) {
      openListingConversation();
    }
  };

  return (
    <View>
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Button
          variant={canCall ? "brand" : "secondary"}
          size="lg"
          className="flex-1"
          onPress={handleCall}
          disabled={!canCall}
        >
          <Icon as={Phone} className="size-5" />
          <Text numberOfLines={1}>{t("call")}</Text>
        </Button>

        <Button
          variant={canMessage ? "default" : "secondary"}
          size="lg"
          className="flex-1"
          disabled={!canMessage || openConversation.isPending}
          onPress={handleMessage}
          accessibilityLabel={t("message")}
          accessibilityState={{
            disabled: !canMessage || openConversation.isPending,
          }}
        >
          <Icon
            as={MessageCircle}
            className={
              canMessage
                ? "size-5 text-primary-foreground"
                : "size-5 text-muted-foreground"
            }
          />
          <Text numberOfLines={1}>{t("message")}</Text>
        </Button>
      </View>
      {canCall && (
        <Text className="px-4 pb-2 text-center text-xs text-muted-foreground">
          {t("contactSmsCaption")}
        </Text>
      )}

      {openConversation.error && (
        <View className="px-4 pb-3">
          <ErrorState
            compact
            error={openConversation.error}
            onRetry={() => openConversation.mutate({ listingId })}
          />
        </View>
      )}
    </View>
  );
}
