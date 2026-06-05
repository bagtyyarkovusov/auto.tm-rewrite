import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

const MEDIA_URL = (
  process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""
).replace(/\/$/, "");

function buildVariantUrl(
  key: string,
  variant: "thumbnail" | "list" | "detail" | "fullscreen",
): string {
  if (!MEDIA_URL) return "";
  if (key.endsWith(".mp4") || key.endsWith(".mov")) {
    return `${MEDIA_URL}/${key}`;
  }
  const base = key.replace(/\/original\.(jpg|webp|jpeg)$/, "");
  return `${MEDIA_URL}/${base}/${variant}.jpg`;
}

type ListingSummary = ListingsSchemas.ListingSummary;

interface ListingCardProps {
  listing: ListingSummary;
  onPress: (id: string) => void;
}

function formatPrice(amount: number): string {
  return `${amount.toLocaleString("en-US")} TMT`;
}

export function ListingCard({ listing, onPress }: ListingCardProps) {
  const imageUrl = listing.coverMediaKey
    ? buildVariantUrl(listing.coverMediaKey, "list")
    : null;

  const titleParts = [
    listing.year ? String(listing.year) : null,
    listing.brandId,
    listing.modelId,
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
              source={{ uri: imageUrl }}
              style={{ width: 140, height: 100 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-xs text-muted-foreground">No photo</Text>
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
              {formatPrice(listing.displayPriceTmt)}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {listing.status === "sold" && (
              <Badge variant="secondary" className="px-2 py-0.5">
                <Text className="text-xs text-secondary-foreground">Sold</Text>
              </Badge>
            )}
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {listing.cityId}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
