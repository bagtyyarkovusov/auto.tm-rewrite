import { useState, useCallback } from "react";
import { View, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Send } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const MAX_CHARS = 1000;

interface MessageComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageComposer({
  onSend,
  disabled = false,
}: MessageComposerProps) {
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const isOverLimit = text.length > MAX_CHARS;
  const canSend = trimmed.length > 0 && !isOverLimit && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
  }, [canSend, trimmed, onSend]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-row items-end gap-2 px-4 py-3 border-t border-border bg-background">
        <View className="flex-1 rounded-2xl bg-muted px-4 py-2.5">
          <TextInput
            className="text-base text-foreground max-h-[120px]"
            placeholder="Message"
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={MAX_CHARS}
            editable={!disabled}
            accessibilityLabel="Message input"
            accessibilityHint="Type a message up to 1000 characters"
          />
          {isOverLimit && (
            <View className="pt-1">
              <Text className="text-xs text-destructive">
                Message must be {MAX_CHARS} characters or less
              </Text>
            </View>
          )}
        </View>
        <Button
          variant="brand"
          size="icon"
          className="rounded-full h-11 w-11"
          disabled={!canSend}
          onPress={handleSend}
          accessibilityLabel="Send message"
        >
          <Icon as={Send} className="size-5 text-primary-foreground" />
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
