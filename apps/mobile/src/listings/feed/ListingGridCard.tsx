import { Image } from "expo-image";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { Heart } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { AuthHref } from "../../auth/intentStore";
import { buildOriginalUrl, buildVariantUrl } from "../detail/buildVariantUrl";
import { useListingFavorite } from "../useListingFavorite";

import { listingGridCardText } from "./listingGridCardText";

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
  /** Brand and model names are still loading; show a title placeholder. */
  titlePending?: boolean;
}

/**
 * Home "New listings" card (32 — Listings, Cards; Auto.ru AR-01-002): a
 * rounded 3:2 photo with ♡ on it, the price, "Brand Model" on one line, and
 * "year, km" or "year, New". Two sit side by side.
 */
export const ListingGridCard = memo(function ListingGridCard({
  listing,
  onPress,
  brandName,
  modelName,
  isAuthenticated,
  returnTo,
  titlePending = false,
}: ListingGridCardProps) {
  const { t, i18n } = useTranslation();
  const coverKey = listing.photoKeys[0] ?? listing.coverMediaKey;
  const [useOriginalImage, setUseOriginalImage] = useState(false);
  const { favorited, pending, toggle } = useListingFavorite({
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
      <View className="aspect-[3/2] w-full overflow-hidden rounded-xl bg-muted">
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
                ? "size-5 text-brand-500 fill-brand-500"
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
        ) : titlePending ? (
          <Skeleton className="my-1 h-3 w-3/4" />
        ) : null}
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
      {/* aspect-ratio does not reach the animated Skeleton, so a plain View
          owns the 3:2 frame. */}
      <View className="aspect-[3/2] w-full">
        <Skeleton className="h-full w-full rounded-xl" />
      </View>
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

const SKELETON_ROWS = [0, 1, 2];

/** Three rows of two card skeletons, for the grid's first load. */
export function ListingGridSkeleton() {
  return (
    <View className="mt-3 gap-3 px-4">
      {SKELETON_ROWS.map((row) => (
        <View key={row} className="flex-row gap-3">
          <ListingGridCardSkeleton />
          <ListingGridCardSkeleton />
        </View>
      ))}
    </View>
  );
}
