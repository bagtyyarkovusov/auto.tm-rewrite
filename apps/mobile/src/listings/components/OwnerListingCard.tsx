import { useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Pencil } from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { buildVariantUrl } from "../detail/buildVariantUrl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { localeTag } from "@/src/i18n/resources";

type ListingSummary = ListingsSchemas.ListingSummary;
type ListingStatus = ListingsSchemas.ListingSummary["status"];

interface OwnerListingCardProps {
  listing: ListingSummary;
  brandName?: string;
  modelName?: string;
  cityName?: string;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}

function formatPrice(amount: number, locale: string): string {
  return `${amount.toLocaleString(localeTag(locale))} TMT`;
}

function statusLabel(status: ListingStatus, t: (key: string) => string): string {
  switch (status) {
    case Enums.ListingStatus.Active:
      return t("active");
    case Enums.ListingStatus.Sold:
      return t("sold");
    case Enums.ListingStatus.Archived:
      return t("archived");
    default:
      return status;
  }
}

function statusBadgeVariant(
  status: ListingStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case Enums.ListingStatus.Active:
      return "default";
    case Enums.ListingStatus.Sold:
      return "secondary";
    case Enums.ListingStatus.Archived:
      return "outline";
    default:
      return "secondary";
  }
}

export function OwnerListingCard({
  listing,
  brandName,
  modelName,
  cityName,
  onOpen,
  onEdit,
}: OwnerListingCardProps) {
  const { t, i18n } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = listing.coverMediaKey
    ? buildVariantUrl(listing.coverMediaKey, "list")
    : null;

  const titleParts = [
    listing.year ? String(listing.year) : null,
    brandName ?? listing.brandId,
    modelName ?? listing.modelId,
  ].filter(Boolean);

  const label = statusLabel(listing.status, t);

  return (
    <Pressable
      className="active:opacity-90"
      onPress={() => onOpen(listing.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t("open")} ${label.toLowerCase()}`}
    >
      <View className="flex-row gap-3 px-4 py-3">
        {/* Cover image */}
        <View className="h-[100px] w-[140px] shrink-0 overflow-hidden rounded-lg bg-muted">
          {imageUrl && !imageFailed ? (
            <Image
              source={{ uri: imageUrl }}
              className="h-[100px] w-[140px]"
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-xs text-muted-foreground">{t("noPhoto")}</Text>
            </View>
          )}
        </View>

        {/* Text content */}
        <View className="min-w-0 flex-1 justify-between py-0.5">
          <View className="gap-1">
            <Text
              className="text-base font-semibold text-foreground leading-5"
              numberOfLines={2}
            >
              {titleParts.join(" ")}
            </Text>
            <Text className="text-lg font-heading text-primary" numberOfLines={1}>
              {formatPrice(listing.displayPriceTmt, i18n.language)}
            </Text>
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant(listing.status)} className="shrink-0 px-2 py-0.5">
              <Text className="text-xs">{label}</Text>
            </Badge>
            <Text className="min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
              {cityName ?? listing.cityId}
            </Text>
          </View>

          <View className="flex-row gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onPress={() => onOpen(listing.id)}
            >
              <Text numberOfLines={1}>{t("open")}</Text>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onPress={() => onEdit(listing.id)}
            >
              <Icon as={Pencil} className="size-4 text-foreground" />
              <Text numberOfLines={1}>{t("edit")}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
