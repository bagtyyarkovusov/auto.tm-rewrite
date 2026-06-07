import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";

interface ConversationListingCardProps {
  listing: {
    id: string;
    brandId: string;
    modelId: string;
    year?: number;
    displayPriceTmt: number;
    priceCurrency: string;
    coverMediaKey?: string;
    status: string;
  };
  brandName?: string;
  modelName?: string;
}

export function ConversationListingCard({
  listing,
  brandName,
  modelName,
}: ConversationListingCardProps) {
  const title = [
    listing.year ? String(listing.year) : null,
    brandName ?? listing.brandId,
    modelName ?? listing.modelId,
  ]
    .filter(Boolean)
    .join(" ");

  const priceText = `${listing.displayPriceTmt.toLocaleString("en-US")} ${listing.priceCurrency}`;

  const imageUrl = listing.coverMediaKey
    ? `${process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""}/${listing.coverMediaKey}`
    : null;

  return (
    <Pressable
      onPress={() => router.push(`/(public)/listings/${listing.id}`)}
      className="flex-row items-center gap-3 px-4 py-3 border-b border-border active:bg-muted/50"
      accessibilityRole="button"
      accessibilityLabel={`Open listing: ${title}`}
    >
      <View className="w-16 h-16 rounded-lg bg-muted overflow-hidden">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            contentFit="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Text className="text-xs text-muted-foreground">No image</Text>
          </View>
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-sm text-muted-foreground">{priceText}</Text>
        {listing.status !== "active" && (
          <Text className="text-xs text-muted-foreground capitalize">
            {listing.status}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
