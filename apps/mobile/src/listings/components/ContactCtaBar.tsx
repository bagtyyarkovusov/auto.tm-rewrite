import { ActivityIndicator, Platform, Share, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Phone, MessageCircle, Share2, Heart } from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/useAuth";
import {
  useAuthIntentStore,
  useReplayAuthAction,
} from "../../auth/intentStore";
import { useOpenConversation } from "../../api/conversations/useOpenConversation";
import { useListingFavorite } from "../useListingFavorite";

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
  isFavorited?: boolean;
}

export function ContactCtaBar({
  listingId,
  contactPhone,
  allowCalls,
  allowChat,
  status,
  isFavorited = false,
}: ContactCtaBarProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const openConversation = useOpenConversation();
  const { t } = useTranslation();
  const listingHref = `/(public)/listings/${listingId}` as const;
  const {
    favorited,
    pending: isFavoritePending,
    toggle: handleFavorite,
  } = useListingFavorite({
    listingId,
    isFavorited,
    isAuthenticated,
    returnTo: listingHref,
    replayAfterSignIn: true,
  });

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

  const handleShare = async () => {
    const url = `https://auto.tm/listings/${listingId}`;
    try {
      // React Native's Android Share bridge forwards only `title` and
      // `message` and drops `url` entirely (Libraries/Share/Share.js), so the
      // link has to be inlined into the message there. iOS keeps them separate
      // so the share sheet can render a rich link preview.
      await Share.share(
        Platform.OS === "android"
          ? { message: `${t("shareMessage")} ${url}` }
          : { message: t("shareMessage"), url },
      );
    } catch {
      // Silently ignore share cancellation or errors
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
          size="icon"
          disabled={!canMessage || openConversation.isPending}
          onPress={handleMessage}
          accessibilityLabel={t("message")}
          accessibilityState={{ disabled: !canMessage || openConversation.isPending }}
        >
          <Icon
            as={MessageCircle}
            className={
              canMessage
                ? "size-5 text-primary-foreground"
                : "size-5 text-muted-foreground"
            }
          />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onPress={handleShare}
          accessibilityLabel={t("share")}
        >
          <Icon as={Share2} className="size-5 text-foreground" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          disabled={isFavoritePending}
          onPress={handleFavorite}
          accessibilityLabel={t("favorite")}
          accessibilityState={{ disabled: isFavoritePending }}
        >
          {isFavoritePending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Icon
              as={Heart}
              className={
                favorited
                  ? "size-5 text-brand-500 fill-brand-500"
                  : "size-5 text-muted-foreground"
              }
            />
          )}
        </Button>
      </View>

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
