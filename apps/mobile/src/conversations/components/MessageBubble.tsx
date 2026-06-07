import { Pressable, View } from "react-native";
import { RotateCcw } from "lucide-react-native";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

export type MessageStatus = "confirmed" | "pending" | "failed";

interface MessageBubbleProps {
  text: string;
  isMine: boolean;
  status: MessageStatus;
  createdAt: string;
  onRetry?: () => void;
}

export function MessageBubble({ text, isMine, status, onRetry }: MessageBubbleProps) {
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
        {status !== "confirmed" && (
          <View className="flex-row items-center justify-end gap-1.5 mt-1">
            {status === "pending" && (
              <Text className="text-xs text-primary-foreground/70">
                Sending…
              </Text>
            )}
            {status === "failed" && (
              <>
                <Text className="text-xs text-destructive-foreground">
                  Failed to send
                </Text>
                {onRetry && (
                  <Pressable
                    onPress={onRetry}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Retry sending message"
                  >
                    <Icon as={RotateCcw} className="size-3.5 text-destructive-foreground" />
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
