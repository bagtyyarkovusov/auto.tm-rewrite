import { useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Enums } from "@auto-tm/contracts";
import { Image as ImageIcon, Trash2, Car } from "lucide-react-native";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

interface ConversationListItemProps {
  conversation: {
    id: string;
    buyerId: string;
    sellerId: string;
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
      text: string | null;
      createdAt: string;
      kind?: "text" | "image" | "post_ref" | "system";
      deletedAt?: string | null;
    };
    updatedAt: string;
    unreadCount?: number;
  };
  brandName?: string;
  modelName?: string;
}

function LastMessagePreview({
  lastMessage,
  isUnread,
}: {
  lastMessage: NonNullable<ConversationListItemProps["conversation"]["lastMessage"]>;
  isUnread: boolean;
}) {
  const { t } = useTranslation();
  const { t: tConv } = useTranslation("conversations");

  const textClass = isUnread
    ? "text-sm flex-1 text-foreground font-medium"
    : "text-sm flex-1 text-muted-foreground";

  if (lastMessage.deletedAt) {
    return (
      <View className="flex-row items-center gap-1.5 flex-1">
        <Icon as={Trash2} className="size-3.5 text-muted-foreground shrink-0" />
        <Text className={`${textClass} italic`} numberOfLines={1}>
          {tConv("messageDeleted")}
        </Text>
      </View>
    );
  }

  if (lastMessage.kind === Enums.MessageKind.Image) {
    return (
      <View className="flex-row items-center gap-1.5 flex-1">
        <Icon as={ImageIcon} className="size-3.5 text-muted-foreground shrink-0" />
        <Text className={textClass} numberOfLines={1}>
          {t("photo")}
        </Text>
      </View>
    );
  }

  if (lastMessage.kind === Enums.MessageKind.PostRef) {
    return (
      <View className="flex-row items-center gap-1.5 flex-1">
        <Icon as={Car} className="size-3.5 text-muted-foreground shrink-0" />
        <Text className={textClass} numberOfLines={1}>
          {t("listing")}
        </Text>
      </View>
    );
  }

  return (
    <Text className={textClass} numberOfLines={1}>
      {lastMessage.text ?? ""}
    </Text>
  );
}

function formatConversationTime(iso: string, locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

export function ConversationListItem({
  conversation,
  brandName,
  modelName,
}: ConversationListItemProps) {
  const { t, i18n } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const listing = conversation.listing;

  const title = listing
    ? [
        listing.year ? String(listing.year) : null,
        brandName ?? listing.brandId.slice(0, 8),
        modelName ?? listing.modelId.slice(0, 8),
      ]
        .filter(Boolean)
        .join(" ")
    : t("chat");

  const priceText = listing
    ? `${listing.displayPriceTmt.toLocaleString("en-US")} ${listing.priceCurrency}`
    : undefined;

  const imageUrl = listing?.coverMediaKey
    ? `${process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""}/${listing.coverMediaKey}`
    : null;

  const handlePress = () => {
    const params: { id: string } & Record<string, string> = {
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

    params.buyerId = conversation.buyerId;
    params.sellerId = conversation.sellerId;

    router.push({
      pathname: "/conversations/[id]",
      params,
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center gap-3 px-4 py-3 border-b border-border active:bg-muted/50"
      accessibilityRole="button"
      accessibilityLabel={`${t("chat")}: ${title}`}
    >
      {/* Cover image */}
      <View className="w-14 h-14 rounded-lg bg-muted overflow-hidden">
        {imageUrl && !imageFailed ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            contentFit="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Text className="text-xs text-muted-foreground">{t("noImage")}</Text>
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
            {formatConversationTime(conversation.updatedAt, i18n.language)}
          </Text>
        </View>

        {priceText && (
          <Text className="text-sm text-muted-foreground">{priceText}</Text>
        )}

        <View className="flex-row items-center gap-2">
          {conversation.lastMessage ? (
            <LastMessagePreview
              lastMessage={conversation.lastMessage}
              isUnread={(conversation.unreadCount ?? 0) > 0}
            />
          ) : (
            <Text className="text-sm flex-1 text-muted-foreground" numberOfLines={1}>
              {t("noMessagesYet")}
            </Text>
          )}
          {(conversation.unreadCount ?? 0) > 0 && (
            <View className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary items-center justify-center">
              <Text className="text-xs text-primary-foreground font-medium">
                {(conversation.unreadCount ?? 0) > 99 ? "99+" : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs text-muted-foreground capitalize">
            {conversation.myRole === "buyer" ? t("youAreBuyer") : t("youAreSeller")}
          </Text>
          {listing && listing.status !== Enums.ListingStatus.Active && (
            <Text className="text-xs text-muted-foreground capitalize">
              · {listing.status}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
