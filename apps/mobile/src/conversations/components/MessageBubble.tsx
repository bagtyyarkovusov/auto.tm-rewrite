import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, RotateCcw } from "lucide-react-native";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

export type MessageStatus = "pending" | "failed" | "sent" | "delivered" | "read";

interface MessageBubbleProps {
  text: string;
  isMine: boolean;
  status: MessageStatus;
  createdAt: string;
  onRetry?: () => void;
}

function StatusIcon({ status, isMine }: { status: MessageStatus; isMine: boolean }) {
  const colorClass = isMine ? "text-primary-foreground/80" : "text-muted-foreground";

  if (status === "read") {
    return <Icon as={CheckCheck} className={`size-3.5 ${colorClass}`} />;
  }
  if (status === "delivered") {
    return <Icon as={Check} className={`size-3.5 ${colorClass}`} />;
  }
  if (status === "sent") {
    return <Icon as={Check} className={`size-3.5 ${colorClass}`} />;
  }
  return null;
}

export function MessageBubble({ text, isMine, status, onRetry }: MessageBubbleProps) {
  const { t } = useTranslation();
  return (
    <View
      className={`flex-row ${isMine ? "justify-end" : "justify-start"} px-4 py-1`}
    >
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isMine
            ? "bg-primary rounded-br-md"
            : "bg-muted rounded-bl-md"
        }`}
      >
        <Text
          className={`text-base leading-5 ${
            isMine ? "text-primary-foreground" : "text-foreground"
          }`}
        >
          {text}
        </Text>
        {(status === "pending" || status === "failed") && (
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
        {isMine && status !== "pending" && status !== "failed" && (
          <View className="flex-row items-center justify-end gap-1 mt-1">
            <StatusIcon status={status} isMine={isMine} />
          </View>
        )}
      </View>
    </View>
  );
}
