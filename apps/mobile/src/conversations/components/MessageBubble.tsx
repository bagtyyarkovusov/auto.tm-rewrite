import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react-native";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

export type MessageStatus = "confirmed" | "pending" | "failed";

interface MessageBubbleProps {
  id: string;
  text: string;
  isMine: boolean;
  status: MessageStatus;
  createdAt: string;
  deletedAt?: string | null;
  canDelete?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
}

export function MessageBubble({
  text,
  isMine,
  status,
  deletedAt,
  canDelete,
  onRetry,
  onDelete,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const isDeleted = !!deletedAt;

  return (
    <View
      className={`flex-row ${isMine ? "justify-end" : "justify-start"} px-4 py-1`}
    >
      <Pressable
        onLongPress={canDelete && !isDeleted ? onDelete : undefined}
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
        ) : (
          <Text
            className={`text-base leading-5 ${
              isMine ? "text-primary-foreground" : "text-foreground"
            }`}
          >
            {text}
          </Text>
        )}
        {status !== "confirmed" && !isDeleted && (
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
      </Pressable>
    </View>
  );
}
