import { Image } from "expo-image";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { Camera, Heart } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { AuthHref } from "../../auth/intentStore";
import { localeTag } from "../../i18n/resources";
import { buildOriginalUrl, buildVariantUrl } from "../detail/buildVariantUrl";
import { formatPrice } from "../formatPrice";
import { useListingFavorite } from "../useListingFavorite";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

export function formatListingDate(publishedAt: string, locale: string, t: (key: string) => string, now = new Date()): string {
  const published = new Date(publishedAt);
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (day(published) === day(now)) return t("resultsToday");
  if (day(published) === day(yesterday)) return t("resultsYesterday");
  const month = published.toLocaleDateString(localeTag(locale), { month: "short" });
  return `${published.getDate()} ${month}${published.getFullYear() !== now.getFullYear() ? ` ${published.getFullYear()}` : ""}`;
}

interface ListingLargeCardProps {
  listing: ListingsSchemas.ListingSummary; onPress: (id: string) => void;
  brandName?: string; modelName?: string; cityName?: string; transmissionName?: string; engineTypeName?: string;
  isAuthenticated: boolean | null; returnTo: AuthHref;
}
function Photo({ mediaKey }: { mediaKey?: string }) {
  const { t } = useTranslation();
  const [original, setOriginal] = useState(false);
  return <View testID="listing-photo" className="h-[170px] min-w-0 flex-1 overflow-hidden bg-muted">
    {mediaKey ? <Image source={{ uri: original ? buildOriginalUrl(mediaKey) : buildVariantUrl(mediaKey, "list") }}
      className="h-full w-full" contentFit="cover" cachePolicy="memory-disk" onError={() => setOriginal(true)} />
      : <View className="h-full items-center justify-center"><Text className="text-xs text-muted-foreground">{t("noPhoto")}</Text></View>}
  </View>;
}

/** Shared approved Results/Favorites card. Contact actions belong to its consumer. */
export const ListingLargeCard = memo(function ListingLargeCard({ listing, onPress, brandName, modelName, cityName, transmissionName, engineTypeName, isAuthenticated, returnTo }: ListingLargeCardProps) {
  const { t, i18n } = useTranslation();
  const { favorited, pending, toggle } = useListingFavorite({ listingId: listing.id, isFavorited: listing.isFavorited ?? false, isAuthenticated, returnTo });
  const price = formatPrice(listing.displayPriceTmt, i18n.language);
  const identity = [brandName, modelName].filter(Boolean).join(" ");
  const title = [identity, listing.year].filter((value) => value != null && value !== "").join(", ");
  const specs = [listing.mileageKm != null ? `${listing.mileageKm.toLocaleString(localeTag(i18n.language))} ${t("km")}` : null, transmissionName, engineTypeName].filter(Boolean).join(" · ");
  const location = [cityName, formatListingDate(listing.publishedAt, i18n.language, t)].filter(Boolean).join(" · ");
  return <View className="bg-card pb-2">
    <Pressable onPress={() => onPress(listing.id)} accessibilityRole="button" accessibilityLabel={[title, price].filter(Boolean).join(", ")} className="active:opacity-90">
      <View className="flex-row gap-0.5">
        <Photo mediaKey={listing.photoKeys[0] ?? listing.coverMediaKey} />
        <Photo mediaKey={listing.photoKeys[1]} />
        {listing.photoCount > 0 ? <View accessibilityLabel={t("resultsPhotoCount", { count: listing.photoCount })} className="absolute bottom-2 left-2 flex-row items-center gap-1 rounded-md bg-black/60 px-2 py-1">
          <Icon as={Camera} className="size-3 text-white" /><Text className="text-xs text-white">{listing.photoCount}</Text>
        </View> : null}
      </View>
      <View className="gap-0.5 px-4 pt-3">
        <Text className="text-xl font-heading text-foreground" numberOfLines={1}>{price}</Text>
        {specs ? <Text className="text-sm text-foreground" numberOfLines={1}>{specs}</Text> : null}
        {title ? <Text className="text-sm text-muted-foreground" numberOfLines={1}>{title}</Text> : null}
      </View>
    </Pressable>
    <View className="min-h-11 flex-row items-center gap-2 px-4">
      <Text className="min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>{location}</Text>
      <Pressable onPress={toggle} disabled={pending} accessibilityRole="button" accessibilityLabel={t("favorite")} accessibilityState={{ selected: favorited, disabled: pending }}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-muted">
        <Icon as={Heart} className={favorited ? "size-6 text-brand-500 fill-brand-500" : "size-6 text-muted-foreground"} />
      </Pressable>
    </View>
  </View>;
});

export function ListingLargeCardSkeleton() {
  return <View className="bg-card pb-2">
    <View className="h-[170px] flex-row gap-0.5"><Skeleton className="h-full flex-1 rounded-none" /><Skeleton className="h-full flex-1 rounded-none" /></View>
    <View className="gap-0.5 px-4 pt-3"><Skeleton className="my-1 h-5 w-1/2" /><Skeleton className="my-1 h-3 w-3/4" /><Skeleton className="my-1 h-3 w-2/3" /></View>
    <View className="min-h-11 flex-row items-center justify-between px-4"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-6 w-6 rounded-full" /></View>
  </View>;
}
