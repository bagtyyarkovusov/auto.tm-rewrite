import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";

interface ConversationListItemProps {
  conversation: {
    id: string;
    listing: {
      id: string;
      brandId: string;
      modelId: string;
      year?: number;
      displayPriceTmt: number;
      priceCurrency: string;
      coverMediaKey?: string;
      status: string;
    } | null;
    myRole: "buyer" | "seller";
    lastMessage?: {
      text: string;
      createdAt: string;
    };
    updatedAt: string;
  };
  brandName?: string;
  modelName?: string;
}

function formatConversationTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function ConversationListItem({
  conversation,
  brandName,
  modelName,
}: ConversationListItemProps) {
  const listing = conversation.listing;

  const title = listing
    ? [
        listing.year ? String(listing.year) : null,
        brandName ?? listing.brandId.slice(0, 8),
        modelName ?? listing.modelId.slice(0, 8),
      ]
        .filter(Boolean)
        .join(" ")
    : "Conversation";

  const priceText = listing
    ? `${listing.displayPriceTmt.toLocaleString("en-US")} ${listing.priceCurrency}`
    : undefined;

  const imageUrl = listing?.coverMediaKey
    ? `${process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""}/${listing.coverMediaKey}`
    : null;

  const handlePress = () => {
    const params: Record<string, string> = {
      id: conversation.id,
    };

    if (listing) {
      params.listingId = listing.id;
      params.brandId = listing.brandId;
      params.modelId = listing.modelId;
      params.year = listing.year ? String(listing.year) : "";
      params.displayPriceTmt = String(listing.displayPriceTmt);
      params.priceCurrency = listing.priceCurrency;
      params.coverMediaKey = listing.coverMediaKey ?? "";
      params.status = listing.status;
    }

    router.push({
      pathname: `/conversations/${conversation.id}`,
      params,
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center gap-3 px-4 py-3 border-b border-border active:bg-muted/50"
      accessibilityRole="button"
      accessibilityLabel={`Open conversation: ${title}`}
    >
      {/* Cover image */}
      <View className="w-14 h-14 rounded-lg bg-muted overflow-hidden">
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

      {/* Content */}
      <View className="flex-1 gap-0.5 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text
            className="text-sm font-medium text-foreground flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text className="text-xs text-muted-foreground shrink-0">
            {formatConversationTime(conversation.updatedAt)}
          </Text>
        </View>

        {priceText && (
          <Text className="text-sm text-muted-foreground">{priceText}</Text>
        )}

        {conversation.lastMessage && (
          <Text
            className="text-sm text-muted-foreground"
            numberOfLines={1}
          >
            {conversation.lastMessage.text}
          </Text>
        )}

        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs text-muted-foreground capitalize">
            {conversation.myRole === "buyer" ? "You are buyer" : "You are seller"}
          </Text>
          {listing && listing.status !== "active" && (
            <Text className="text-xs text-muted-foreground capitalize">
              · {listing.status}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
