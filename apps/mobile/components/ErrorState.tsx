import { View } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useErrorCopy } from "@/src/api/useErrorCopy";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ error, onRetry, compact = false }: ErrorStateProps) {
  const { t } = useTranslation("common");
  const copy = useErrorCopy(error);

  if (compact) {
    return (
      <View
        accessibilityRole="alert"
        className="flex-row items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2"
      >
        <Icon as={AlertTriangle} className="size-4 shrink-0 text-destructive" />
        <Text className="flex-1 text-sm text-destructive" numberOfLines={2}>
          {copy.title}
        </Text>
        {copy.retryable && onRetry && (
          <Button variant="ghost" size="sm" onPress={onRetry}>
            <Text className="text-sm text-destructive">{t("retry")}</Text>
          </Button>
        )}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="alert"
      className="flex-1 items-center justify-center px-6 gap-4"
    >
      <View className="size-16 items-center justify-center rounded-full bg-destructive/10">
        <Icon as={AlertTriangle} className="size-8 text-destructive" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-center text-base font-semibold text-foreground" numberOfLines={2}>
          {copy.title}
        </Text>
        <Text className="text-center text-sm text-muted-foreground" numberOfLines={3}>
          {copy.description}
        </Text>
      </View>
      {copy.retryable && onRetry && (
        <Button variant="outline" size="pill" onPress={onRetry}>
          <Text>{t("retry")}</Text>
        </Button>
      )}
    </View>
  );
}
