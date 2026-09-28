import { Image } from "expo-image";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { Heart } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { AuthHref } from "../../auth/intentStore";
import { buildOriginalUrl, buildVariantUrl } from "../detail/buildVariantUrl";

import { listingGridCardText } from "./listingGridCardText";
import { useCardFavorite } from "./useCardFavorite";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

interface ListingGridCardProps {
  listing: ListingsSchemas.ListingSummary;
  onPress: (id: string) => void;
  brandName?: string;
  modelName?: string;
  isAuthenticated: boolean | null;
  returnTo: AuthHref;
}

/**
 * Home "New listings" card (32 — Listings, Cards; Auto.ru AR-01-002): a
 * rounded photo with ♡ on it, the price, "Brand Model" on one line, and
 * "year, km" or "year, New". Two sit side by side.
 */
export const ListingGridCard = memo(function ListingGridCard({
  listing,
  onPress,
  brandName,
  modelName,
  isAuthenticated,
  returnTo,
}: ListingGridCardProps) {
  const { t, i18n } = useTranslation();
  const coverKey = listing.photoKeys[0] ?? listing.coverMediaKey;
  const [useOriginalImage, setUseOriginalImage] = useState(false);
  const { favorited, pending, toggle } = useCardFavorite({
    listingId: listing.id,
    isFavorited: listing.isFavorited ?? false,
    isAuthenticated,
    returnTo,
  });

  const text = listingGridCardText({
    listing,
    brandName,
    modelName,
    locale: i18n.language,
    newLabel: t("new"),
    kmLabel: t("km"),
  });

  const imageUrl = coverKey
    ? useOriginalImage
      ? buildOriginalUrl(coverKey)
      : buildVariantUrl(coverKey, "list")
    : null;

  return (
    <Pressable
      className="min-w-0 flex-1 active:opacity-90"
      onPress={() => onPress(listing.id)}
      accessibilityRole="button"
      accessibilityLabel={[text.title, text.price, text.meta]
        .filter(Boolean)
        .join(", ")}
    >
      <View className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="h-full w-full"
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setUseOriginalImage(true)}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className="text-xs text-muted-foreground">{t("noPhoto")}</Text>
          </View>
        )}

        {/* The dark disc keeps the ♡ legible on any photo, in either theme. */}
        <Pressable
          className="absolute right-1 top-1 h-9 w-9 items-center justify-center rounded-full bg-black/40 active:opacity-70"
          hitSlop={6}
          onPress={toggle}
          disabled={pending}
          accessibilityRole="button"
          accessibilityLabel={t("favorite")}
          accessibilityState={{ selected: favorited, disabled: pending }}
        >
          <Icon
            as={Heart}
            className={
              favorited
                ? "size-5 text-brand-500 fill-current"
                : "size-5 text-white"
            }
          />
        </Pressable>
      </View>

      <View className="mt-2 gap-0.5">
        <Text className="text-base font-semibold leading-5 text-foreground" numberOfLines={1}>
          {text.price}
        </Text>
        {text.title ? (
          <Text className="text-sm leading-5 text-foreground" numberOfLines={1}>
            {text.title}
          </Text>
        ) : (
          <Skeleton className="my-1 h-3 w-3/4" />
        )}
        {text.meta ? (
          <Text className="text-sm leading-5 text-muted-foreground" numberOfLines={1}>
            {text.meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/** Same shape as `ListingGridCard`, for the first load. */
export function ListingGridCardSkeleton() {
  return (
    <View className="min-w-0 flex-1">
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      {/* Each bar fills one 20dp text line, so the grid does not jump when
          the first page replaces the skeletons. */}
      <View className="mt-2 gap-0.5">
        <Skeleton className="my-0.5 h-4 w-1/2" />
        <Skeleton className="my-1 h-3 w-3/4" />
        <Skeleton className="my-1 h-3 w-1/3" />
      </View>
    </View>
  );
}
