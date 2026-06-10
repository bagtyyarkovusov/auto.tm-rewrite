import { ActivityIndicator, Share, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Phone, MessageCircle, Share2, Heart } from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/useAuth";
import { useAuthIntentStore } from "../../auth/intentStore";
import { useOpenConversation } from "../../api/conversations/useOpenConversation";
import { useFavoriteListing } from "../../api/listings/useFavoriteListing";
import { useUnfavoriteListing } from "../../api/listings/useUnfavoriteListing";

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
  const favorite = useFavoriteListing();
  const unfavorite = useUnfavoriteListing();
  const { t } = useTranslation();

  const [optimisticFavorited, setOptimisticFavorited] = useState(isFavorited);

  const isSold = status === Enums.ListingStatus.Sold;
  const isArchived = status === Enums.ListingStatus.Archived;
  const canCall = allowCalls && !!contactPhone && !isSold && !isArchived;
  const canMessage = allowChat && !isSold && !isArchived;
  const isFavoritePending = favorite.isPending || unfavorite.isPending;

  const handleCall = async () => {
    if (!canCall || !contactPhone) return;
    const url = `tel:${contactPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const handleMessage = () => {
    if (!canMessage) return;

    if (isAuthenticated === false) {
      useAuthIntentStore.getState().setIntent({
        returnPath: `/conversations/open-listing?listingId=${listingId}`,
      });
      router.push("/(auth)/phone");
      return;
    }

    if (isAuthenticated === true) {
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
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("shareMessage"),
        url: `https://autotm.tm/listings/${listingId}`,
      });
    } catch {
      // Silently ignore share cancellation or errors
    }
  };

  const handleFavorite = () => {
    if (isAuthenticated === false) {
      useAuthIntentStore.getState().setIntent({
        returnPath: `/(public)/listings/${listingId}`,
      });
      router.push("/(auth)/phone");
      return;
    }

    const next = !optimisticFavorited;
    setOptimisticFavorited(next);

    const mutation = next ? favorite : unfavorite;
    mutation.mutate(listingId, {
      onError: () => {
        // Rollback on error
        setOptimisticFavorited(!next);
      },
    });
  };

  return (
    <View className="flex-row items-center gap-2 px-4 py-3">
      <Button
        variant={canCall ? "brand" : "secondary"}
        size="lg"
        className="flex-1"
        onPress={handleCall}
        disabled={!canCall}
      >
        <Icon as={Phone} className="size-5" />
        <Text>{t("call")}</Text>
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

      <Button variant="secondary" size="icon" onPress={handleShare}>
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
              optimisticFavorited
                ? "size-5 text-brand-500 fill-current"
                : "size-5 text-muted-foreground"
            }
          />
        )}
      </Button>
    </View>
  );
}
