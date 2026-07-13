import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, RotateCcw, Trash2 } from "lucide-react-native";
import { Image } from "expo-image";

import { buildChatImageUrl } from "../upload/buildChatImageUrl";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

export type MessageStatus = "pending" | "failed" | "sent" | "delivered" | "read";

export interface ImageMessageMetadata {
  key: string;
  width?: number;
  height?: number;
}

interface MessageBubbleProps {
  id: string;
  text: string;
  kind?: "text" | "image";
  metadata?: ImageMessageMetadata;
  localImageUri?: string;
  isMine: boolean;
  status: MessageStatus;
  createdAt: string;
  deletedAt?: string | null;
  canDelete?: boolean;
  canReport?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onImagePress?: () => void;
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
          <Icon as={Trash2} className="size-6 text-muted-foreground" />
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
  onRetry,
  onDelete,
  onReport,
  onImagePress,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const isDeleted = !!deletedAt;
  const isImage = kind === "image" && !isDeleted;
  const imageUri = localImageUri ?? (metadata?.key ? buildChatImageUrl(metadata.key) : undefined);

  let longPressAction: (() => void) | undefined;
  if (!isDeleted) {
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
        {isDeleted ? (
          <View className="flex-row items-center gap-1.5">
            <Icon
              as={Trash2}
              className="size-4 text-muted-foreground"
            />
            <Text className="text-sm italic text-muted-foreground">
              {t("messageDeleted")}
            </Text>
          </View>
        ) : isImage && imageUri ? (
          <ImageBubble
            uri={imageUri}
            width={metadata?.width}
            height={metadata?.height}
            onPress={onImagePress}
          />
        ) : (
          <Text
            className={`text-base leading-5 ${
              isMine ? "text-primary-foreground" : "text-foreground"
            }`}
          >
            {text}
          </Text>
        )}

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
      </Pressable>
    </View>
  );
}
