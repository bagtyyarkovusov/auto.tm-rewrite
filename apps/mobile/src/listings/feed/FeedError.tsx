import { View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface FeedErrorProps {
  onRetry: () => void;
}

export function FeedError({ onRetry }: FeedErrorProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Icon as={AlertTriangle} className="size-8 text-muted-foreground" />
      <View className="items-center gap-1">
        <Text className="text-base font-semibold text-foreground">
          Could not load listings
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          Check your connection and try again
        </Text>
      </View>
      <Button variant="outline" size="pill" onPress={onRetry}>
        <Text>Retry</Text>
      </Button>
    </View>
  );
}
