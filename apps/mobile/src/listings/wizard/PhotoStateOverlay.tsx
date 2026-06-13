import {
  View,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { RefreshCw, X, AlertTriangle, WifiOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import type { StagedPhoto } from "../uploadStaging/types";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

interface PhotoStateOverlayProps {
  photo: StagedPhoto;
  onRetry: (photoId: string) => void;
}

export function PhotoStateOverlay({
  photo,
  onRetry,
}: PhotoStateOverlayProps) {
  const { t } = useTranslation();

  if (photo.state === "selected") {
    return (
      <View className="absolute inset-0 items-center justify-center bg-black/40">
        <ActivityIndicator color="white" />
      </View>
    );
  }

  if (photo.state === "compressed") {
    return (
      <View className="absolute right-1 top-1 rounded-full bg-black/40 p-1">
        <ActivityIndicator size="small" color="white" />
      </View>
    );
  }

  if (photo.state === "presigned" || photo.state === "uploading") {
    return (
      <View className="absolute inset-0 items-center justify-center bg-black/40">
        <ActivityIndicator color="white" />
        <Text className="mt-1 text-xs text-white">{t("uploading")}</Text>
      </View>
    );
  }

  if (photo.state === "uploaded" || photo.state === "attached") {
    return null;
  }

  if (photo.state === "failed") {
    return (
      <Pressable
        className="absolute inset-0 items-center justify-center bg-black/50"
        onPress={() => {
          if (photo.error?.retryable !== false) {
            onRetry(photo.photoId);
          }
        }}
      >
        <View className="items-center gap-1">
          {photo.error?.retryable === false ? (
            <>
              <Icon as={X} className="size-6 text-destructive" />
              <Text className="text-xs text-destructive">{t("failed")}</Text>
            </>
          ) : (
            <>
              <Icon as={RefreshCw} className="size-6 text-white" />
              <Text className="text-xs text-white">{t("retry")}</Text>
            </>
          )}
          {photo.error && (
            <Text className="px-2 text-center text-[10px] text-white">
              {photo.error.message}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }

  if (photo.state === "waiting_for_network") {
    return (
      <View className="absolute inset-0 items-center justify-center bg-warning-500/10">
        <View className="items-center gap-1 rounded-md bg-background/90 px-2 py-1.5">
          <Icon as={WifiOff} className="size-5 text-warning-500" />
          <Text className="text-center text-[10px] font-medium text-muted-foreground">
            {t("waitingForNetwork")}
          </Text>
        </View>
      </View>
    );
  }

  if (photo.state === "lost") {
    return (
      <View className="absolute inset-0 items-center justify-center bg-black/40">
        <Icon as={AlertTriangle} className="size-6 text-warning-500" />
        <Text className="mt-1 text-xs text-white">{t("lost")}</Text>
      </View>
    );
  }

  return null;
}
