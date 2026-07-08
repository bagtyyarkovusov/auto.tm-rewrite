import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck } from "lucide-react-native";

import { buildOriginalUrl, buildVariantUrl } from "../detail/buildVariantUrl";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type ListingSummary = ListingsSchemas.ListingSummary;

interface ListingCardProps {
  listing: ListingSummary;
  onPress: (id: string) => void;
  brandName?: string;
  modelName?: string;
  cityName?: string;
}

function formatPrice(amount: number, locale: string): string {
  return `${amount.toLocaleString(locale)} TMT`;
}

export function ListingCard({
  listing,
  onPress,
  brandName,
  modelName,
  cityName,
}: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const imageUrl = listing.coverMediaKey
    ? buildVariantUrl(listing.coverMediaKey, "list")
    : null;
  const fallbackImageUrl = listing.coverMediaKey
    ? buildOriginalUrl(listing.coverMediaKey)
    : null;
  const [useOriginalImage, setUseOriginalImage] = useState(false);

  const titleParts = [
    listing.year ? String(listing.year) : null,
    brandName ?? t("loading"),
    modelName ?? t("loading"),
  ].filter(Boolean);

  return (
    <Pressable
      className="active:opacity-90"
      onPress={() => onPress(listing.id)}
    >
      <View className="flex-row gap-3 px-4 py-3">
        {/* Cover image */}
        <View className="h-[100px] w-[140px] overflow-hidden rounded-lg bg-muted">
          {imageUrl ? (
            <Image
              source={{ uri: useOriginalImage && fallbackImageUrl ? fallbackImageUrl : imageUrl }}
              style={{ width: 140, height: 100 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setUseOriginalImage(true)}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-xs text-muted-foreground">{t("noPhoto")}</Text>
            </View>
          )}
        </View>

        {/* Text content */}
        <View className="flex-1 justify-between py-0.5">
          <View className="gap-1">
            <Text className="text-base font-semibold text-foreground leading-5" numberOfLines={2}>
              {titleParts.join(" ")}
            </Text>
            <Text className="text-lg font-heading text-primary">
              {formatPrice(listing.displayPriceTmt, i18n.language)}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {listing.status === Enums.ListingStatus.Sold && (
              <Badge variant="secondary" className="px-2 py-0.5">
                <Text className="text-xs text-secondary-foreground">{t("sold")}</Text>
              </Badge>
            )}
            {listing.sellerTrust?.phoneVerified && (
              <Badge variant="default" className="px-2 py-0.5">
                <Icon as={BadgeCheck} className="size-3 text-foreground" />
                <Text className="text-xs text-foreground">{t("verifiedPhone")}</Text>
              </Badge>
            )}
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {cityName ?? t("loading")}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
