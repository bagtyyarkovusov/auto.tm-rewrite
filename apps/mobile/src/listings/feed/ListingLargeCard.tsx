import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { Enums, type ListingsSchemas } from "@auto-tm/contracts";
import { Camera, Heart, MessageCircle, Phone } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { AuthHref } from "../../auth/intentStore";
import { useOpenListingConversation } from "../../conversations/useOpenListingConversation";
import { localeTag } from "../../i18n/resources";
import { buildOriginalUrl, buildVariantUrl } from "../detail/buildVariantUrl";
import { formatPrice } from "../formatPrice";
import { useListingFavorite } from "../useListingFavorite";

import { listingSpecLine } from "./listingSpecLine";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export function formatListingDate(publishedAt: string, locale: string, t: (key: string) => string, now = new Date()): string {
  const published = new Date(publishedAt);
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (day(published) === day(now)) return t("resultsToday");
  if (day(published) === day(yesterday)) return t("resultsYesterday");
  const month = published.toLocaleDateString(localeTag(locale), { month: "short" });
  return `${published.getDate()} ${month}${published.getFullYear() !== now.getFullYear() ? ` ${published.getFullYear()}` : ""}`;
}

interface CardBaseProps {
  onPress: (id: string) => void;
  brandName?: string; modelName?: string; cityName?: string; transmissionName?: string; engineTypeName?: string;
}
/** Results: ♡ toggles the Favorite, and sign-in is asked for when needed. */
interface ResultsCardProps extends CardBaseProps {
  listing: ListingsSchemas.ListingSummary;
  isAuthenticated: boolean | null; returnTo: AuthHref;
  onRemoveFavorite?: undefined;
}
/** Favorites: Call and Message on an active Listing, and a filled ♥ that removes it. */
interface FavoritesCardProps extends CardBaseProps {
  listing: ListingsSchemas.FavoriteListingSummary;
  /** The User's own Listing gets no contact buttons. */
  isOwn: boolean;
  onRemoveFavorite: (listing: ListingsSchemas.FavoriteListingSummary) => void;
}
type ListingLargeCardProps = ResultsCardProps | FavoritesCardProps;

/** A photo frame. `flex` is its share of the row: one wide frame, or 62 and 38 for the two-photo grid. */
function Photo({ mediaKey, flex }: { mediaKey?: string; flex: number }) {
  const { t } = useTranslation();
  const [original, setOriginal] = useState(false);
  return <View testID="listing-photo" style={{ flex }} className="h-[170px] min-w-0 overflow-hidden bg-muted">
    {mediaKey ? <Image source={{ uri: original ? buildOriginalUrl(mediaKey) : buildVariantUrl(mediaKey, "list") }}
      className="h-full w-full" contentFit="cover" cachePolicy="memory-disk" onError={() => setOriginal(true)} />
      : <View className="h-full items-center justify-center"><Text className="text-caption text-muted-foreground">{t("noPhotos")}</Text></View>}
  </View>;
}

function FeedFavoriteButton({ listingId, isFavorited, isAuthenticated, returnTo }: { listingId: string; isFavorited: boolean; isAuthenticated: boolean | null; returnTo: AuthHref }) {
  const { t } = useTranslation();
  const { favorited, pending, toggle } = useListingFavorite({ listingId, isFavorited, isAuthenticated, returnTo });
  return <Pressable onPress={toggle} disabled={pending} accessibilityRole="button" accessibilityLabel={t("favorite")} accessibilityState={{ selected: favorited, disabled: pending }}
    className="h-11 w-11 items-center justify-center rounded-full active:bg-muted">
    <Icon as={Heart} className={favorited ? "size-6 text-brand-500 fill-brand-500" : "size-6 text-muted-foreground"} />
  </Pressable>;
}

function RemoveFavoriteButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t("removeFromFavorites")} accessibilityState={{ selected: true }}
    className="h-11 w-11 items-center justify-center rounded-full active:bg-muted">
    <Icon as={Heart} className="size-6 text-brand-500 fill-brand-500" />
  </Pressable>;
}

/** Call opens the dialer with the Listing contact phone; Message opens the Conversation about the Listing. */
function ContactActions({ listing }: { listing: ListingsSchemas.FavoriteListingSummary }) {
  const { t } = useTranslation();
  const conversation = useOpenListingConversation(listing.id);
  const phone = listing.allowCalls ? listing.contactPhone : undefined;
  if (!phone && !listing.allowChat) return null;
  const call = async () => {
    const url = `tel:${phone}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  };
  return <View className="gap-2 px-4 pt-3">
    <View className="flex-row gap-2">
      {phone ? <Button variant="brand" className="flex-1 rounded-full" onPress={() => void call()} accessibilityLabel={t("call")}>
        <Icon as={Phone} className="size-5" /><Text numberOfLines={1}>{t("call")}</Text>
      </Button> : null}
      {listing.allowChat ? <Button variant="secondary" className="flex-1 rounded-full" disabled={conversation.isPending}
        onPress={() => conversation.open()} accessibilityLabel={t("message")} accessibilityState={{ disabled: conversation.isPending }}>
        <Icon as={MessageCircle} className="size-5 text-foreground" /><Text numberOfLines={1}>{t("message")}</Text>
      </Button> : null}
    </View>
    {conversation.error ? <ErrorState compact error={conversation.error} onRetry={conversation.retry} /> : null}
  </View>;
}

/**
 * The approved large card. Results shows it with ♡; Favorites adds Call and
 * Message, a filled ♥ that removes the Favorite, and dims a sold or archived
 * Listing with its label and no contact buttons.
 */
export const ListingLargeCard = memo(function ListingLargeCard(props: ListingLargeCardProps) {
  const { listing, onPress, brandName, modelName, cityName, transmissionName, engineTypeName } = props;
  const { t, i18n } = useTranslation();
  const photoKeys = listing.photoKeys.length ? listing.photoKeys : listing.coverMediaKey ? [listing.coverMediaKey] : [];
  const price = formatPrice(listing.displayPriceTmt, i18n.language);
  const identity = [brandName, modelName].filter(Boolean).join(" ");
  const title = [identity, listing.year].filter((value) => value != null && value !== "").join(", ");
  const specs = listingSpecLine({ mileageKm: listing.mileageKm, transmissionName, engineTypeName, locale: i18n.language, kmLabel: t("km") });
  const location = [cityName, formatListingDate(listing.publishedAt, i18n.language, t)].filter(Boolean).join(" · ");
  const favoriteCard = props.onRemoveFavorite ? props : undefined;
  const resultsCard = props.onRemoveFavorite ? undefined : props;
  const closedLabel = listing.status === Enums.ListingStatus.Sold ? t("sold") : listing.status === Enums.ListingStatus.Archived ? t("removedFromSale") : null;
  return <View className="bg-card pb-2">
    <Pressable onPress={() => onPress(listing.id)} accessibilityRole="button" accessibilityLabel={[title, price, closedLabel].filter(Boolean).join(", ")} className="active:opacity-90">
      <View>
        <View testID="listing-photos" className={cn("flex-row gap-0.5", closedLabel && "opacity-50")}>
          {photoKeys.length > 1 ? <>
            <Photo mediaKey={photoKeys[0]} flex={62} />
            <Photo mediaKey={photoKeys[1]} flex={38} />
          </> : <Photo mediaKey={photoKeys[0]} flex={1} />}
        </View>
        {listing.photoCount > 1 ? <View accessibilityLabel={t("resultsPhotoCount", { count: listing.photoCount })} className="absolute bottom-2 left-2 flex-row items-center gap-1 rounded-md bg-black/60 px-2 py-1">
          <Icon as={Camera} className="size-3 text-white" /><Text className="text-caption text-white">{listing.photoCount}</Text>
        </View> : null}
        {closedLabel ? <View className={cn("absolute left-2 top-2 rounded-full border px-2 py-0.5",
          listing.status === Enums.ListingStatus.Sold ? "border-foreground bg-foreground" : "border-border bg-background")}>
          <Text className={cn("text-caption font-medium", listing.status === Enums.ListingStatus.Sold ? "text-background" : "text-foreground")}>{closedLabel}</Text>
        </View> : null}
      </View>
      <View className="gap-0.5 px-4 pt-3">
        <Text className={cn("text-headline font-heading", closedLabel ? "text-muted-foreground" : "text-foreground")} numberOfLines={1}>{price}</Text>
        {specs ? <Text className="text-callout text-foreground" numberOfLines={1}>{specs}</Text> : null}
        {title ? <Text className="text-callout text-muted-foreground" numberOfLines={1}>{title}</Text> : null}
      </View>
    </Pressable>
    {favoriteCard && !closedLabel && !favoriteCard.isOwn ? <ContactActions listing={favoriteCard.listing} /> : null}
    <View className="min-h-11 flex-row items-center gap-2 px-4">
      <Text className="min-w-0 flex-1 text-caption text-muted-foreground" numberOfLines={1}>{location}</Text>
      {favoriteCard ? <RemoveFavoriteButton onPress={() => favoriteCard.onRemoveFavorite(favoriteCard.listing)} /> : null}
      {resultsCard ? <FeedFavoriteButton listingId={listing.id} isFavorited={listing.isFavorited ?? false}
        isAuthenticated={resultsCard.isAuthenticated} returnTo={resultsCard.returnTo} /> : null}
    </View>
  </View>;
});

/** Skeleton in the card's shape; `withActions` adds the Favorites Call and Message buttons. */
export function ListingLargeCardSkeleton({ withActions = false }: { withActions?: boolean }) {
  return <View className="bg-card pb-2">
    <View testID="listing-photo-skeleton" className="h-[170px]"><Skeleton className="h-full w-full rounded-none" /></View>
    <View className="gap-0.5 px-4 pt-3"><Skeleton className="my-1 h-5 w-1/2" /><Skeleton className="my-1 h-3 w-3/4" /><Skeleton className="my-1 h-3 w-2/3" /></View>
    {withActions ? <View testID="listing-actions-skeleton" className="flex-row gap-2 px-4 pt-3">
      <Skeleton testID="skeleton-button" className="h-12 flex-1 rounded-full" /><Skeleton testID="skeleton-button" className="h-12 flex-1 rounded-full" />
    </View> : null}
    <View className="min-h-11 flex-row items-center justify-between px-4"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-6 w-6 rounded-full" /></View>
  </View>;
}
