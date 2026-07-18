import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, Flag, ImageOff, RotateCcw, Trash2 } from "lucide-react-native";
import { Image } from "expo-image";
import type { ConversationsSchemas } from "@auto-tm/contracts";

import { buildChatImageUrl } from "../upload/buildChatImageUrl";

import { PostRefCard } from "./PostRefCard";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

export type MessageStatus = "pending" | "failed" | "sent" | "delivered" | "read";

export interface ImageMessageMetadata {
  key: string;
  width?: number;
  height?: number;
}

export type PostRefMessageMetadata = ConversationsSchemas.PostRefMessageMetadata;

interface MessageBubbleProps {
  id: string;
  text: string;
  kind?: "text" | "image" | "post_ref";
  metadata?: ImageMessageMetadata | PostRefMessageMetadata;
  localImageUri?: string;
  isMine: boolean;
  status: MessageStatus;
  createdAt: string;
  deletedAt?: string | null;
  canDelete?: boolean;
  canReport?: boolean;
  reported?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onImagePress?: () => void;
  postRefBrandName?: string;
  postRefModelName?: string;
  onPostRefPress?: (listingId: string) => void;
}

const BUBBLE_MAX_WIDTH = 256;
const DEFAULT_IMAGE_HEIGHT = 192;

function StatusIcon({ status, isMine }: { status: MessageStatus; isMine: boolean }) {
  const readColorClass = isMine
    ? "text-primary-foreground"
    : "text-foreground";
  const defaultColorClass = isMine
    ? "text-primary-foreground/80"
    : "text-muted-foreground";

  if (status === "read") {
    return <Icon as={CheckCheck} className={`size-3.5 ${readColorClass}`} />;
  }
  if (status === "delivered") {
    return <Icon as={CheckCheck} className={`size-3.5 ${defaultColorClass}`} />;
  }
  if (status === "sent") {
    return <Icon as={Check} className={`size-3.5 ${defaultColorClass}`} />;
  }
  return null;
}

function ImageBubble({
  uri,
  width,
  height,
  onPress,
}: {
  uri: string;
  width?: number;
  height?: number;
  onPress?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  const displayHeight =
    width && height && width > 0
      ? Math.min(DEFAULT_IMAGE_HEIGHT, Math.round((height / width) * BUBBLE_MAX_WIDTH))
      : DEFAULT_IMAGE_HEIGHT;

  return (
    <Pressable onPress={onPress} className="overflow-hidden rounded-xl">
      {failed ? (
        <View
          className="items-center justify-center bg-muted"
          style={{ width: BUBBLE_MAX_WIDTH, height: DEFAULT_IMAGE_HEIGHT }}
        >
          <Icon as={ImageOff} className="size-6 text-muted-foreground" />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={{ width: BUBBLE_MAX_WIDTH, height: displayHeight }}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      )}
    </Pressable>
  );
}

interface BubbleContentProps {
  isDeleted: boolean;
  isImage: boolean;
  isPostRef: boolean;
  imageUri?: string;
  text: string;
  metadata?: ImageMessageMetadata | PostRefMessageMetadata;
  isMine: boolean;
  onImagePress?: () => void;
  postRefBrandName?: string;
  postRefModelName?: string;
  onPostRefPress?: (listingId: string) => void;
}

function isPostRefMetadata(
  metadata: ImageMessageMetadata | PostRefMessageMetadata | undefined,
): metadata is PostRefMessageMetadata {
  return metadata != null && "listingId" in metadata;
}

function BubbleContent({
  isDeleted,
  isImage,
  isPostRef,
  imageUri,
  text,
  metadata,
  isMine,
  onImagePress,
  postRefBrandName,
  postRefModelName,
  onPostRefPress,
}: BubbleContentProps) {
  const { t } = useTranslation();

  if (isDeleted) {
    return (
      <View className="flex-row items-center gap-1.5">
        <Icon as={Trash2} className="size-4 text-muted-foreground" />
        <Text className="text-sm italic text-muted-foreground">
          {t("conversations:messageDeleted")}
        </Text>
      </View>
    );
  }

  if (isImage && imageUri) {
    const imageMeta =
      metadata && "key" in metadata ? metadata : undefined;
    return (
      <ImageBubble
        uri={imageUri}
        width={imageMeta?.width}
        height={imageMeta?.height}
        onPress={onImagePress}
      />
    );
  }

  if (isPostRef && isPostRefMetadata(metadata)) {
    return (
      <PostRefCard
        listingId={metadata.listingId}
        brandId={metadata.brandId}
        modelId={metadata.modelId}
        year={metadata.year}
        displayPriceTmt={metadata.displayPriceTmt}
        priceCurrency={metadata.priceCurrency}
        coverMediaKey={metadata.coverMediaKey}
        status={metadata.status}
        available={metadata.available}
        brandName={postRefBrandName}
        modelName={postRefModelName}
        onPress={onPostRefPress}
      />
    );
  }

  return (
    <Text
      className={`text-base leading-5 ${
        isMine ? "text-primary-foreground" : "text-foreground"
      }`}
    >
      {text}
    </Text>
  );
}

export function MessageBubble({
  text,
  isMine,
  status,
  kind = "text",
  metadata,
  localImageUri,
  deletedAt,
  canDelete,
  canReport,
  reported,
  onRetry,
  onDelete,
  onReport,
  onImagePress,
  postRefBrandName,
  postRefModelName,
  onPostRefPress,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const isDeleted = !!deletedAt;
  const isImage = kind === "image" && !isDeleted;
  const isPostRef = kind === "post_ref" && !isDeleted;
  const isReported = !!reported;
  const imageUri =
    localImageUri ??
    (metadata && "key" in metadata && metadata.key
      ? buildChatImageUrl(metadata.key)
      : undefined);

  let longPressAction: (() => void) | undefined;
  if (!isDeleted && !isReported) {
    if (canDelete) {
      longPressAction = onDelete;
    } else if (canReport) {
      longPressAction = onReport;
    }
  }

  return (
    <View
      className={`flex-row ${isMine ? "justify-end" : "justify-start"} px-4 py-1`}
    >
      <Pressable
        onLongPress={longPressAction}
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isDeleted
            ? "bg-muted/60 rounded-md"
            : isMine
              ? "bg-primary rounded-br-md"
              : "bg-muted rounded-bl-md"
        }`}
      >
        <BubbleContent
          isDeleted={isDeleted}
          isImage={isImage}
          isPostRef={isPostRef}
          imageUri={imageUri}
          text={text}
          metadata={metadata}
          isMine={isMine}
          onImagePress={onImagePress}
          postRefBrandName={postRefBrandName}
          postRefModelName={postRefModelName}
          onPostRefPress={onPostRefPress}
        />

        {(status === "pending" || status === "failed") && !isDeleted && (
          <View className="flex-row items-center justify-end gap-1.5 mt-1">
            {status === "pending" && (
              <Text className="text-xs text-primary-foreground/90">
                {t("sending")}
              </Text>
            )}
            {status === "failed" && (
              <>
                <Text className={`text-xs ${isMine ? "text-destructive-foreground" : "text-destructive"}`}>
                  {t("failedToSend")}
                </Text>
                {onRetry && (
                  <Pressable
                    onPress={onRetry}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={t("retry")}
                  >
                    <Icon as={RotateCcw} className={`size-3.5 ${isMine ? "text-destructive-foreground" : "text-destructive"}`} />
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
        {isMine && status !== "pending" && status !== "failed" && !isDeleted && (
          <View className="flex-row items-center justify-end gap-1 mt-1">
            <StatusIcon status={status} isMine={isMine} />
          </View>
        )}

        {isReported && !isDeleted && (
          <View
            className={`flex-row items-center gap-1 mt-1 ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            <Icon
              as={Flag}
              className={`size-3.5 ${
                isMine ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            />
            <Text
              className={`text-xs ${
                isMine ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {t("reported")}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
