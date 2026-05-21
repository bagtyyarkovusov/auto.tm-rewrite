import {
  View,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Check, RefreshCw, X, AlertTriangle } from "lucide-react-native";

import type { StagedPhoto } from "../uploadStaging/types";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

interface PhotoStateOverlayProps {
  photo: StagedPhoto;
  index: number;
  onRetry: (photoId: string) => void;
}

export function PhotoStateOverlay({
  photo,
  index,
  onRetry,
}: PhotoStateOverlayProps) {
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
        <Text className="mt-1 text-xs text-white">Uploading</Text>
      </View>
    );
  }

  if (photo.state === "uploaded" || photo.state === "attached") {
    return (
      <>
        <View className="absolute right-1 top-1 rounded-full bg-success-500 p-1">
          <Icon as={Check} className="size-3 text-white" />
        </View>
        {index === 0 && (
          <View className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5">
            <Text className="text-[10px] font-medium text-white">
              Cover
            </Text>
          </View>
        )}
      </>
    );
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
              <Text className="text-xs text-destructive">Failed</Text>
            </>
          ) : (
            <>
              <Icon as={RefreshCw} className="size-6 text-white" />
              <Text className="text-xs text-white">Retry</Text>
            </>
          )}
          {photo.error && (
            <Text className="px-2 text-center text-[10px] text-white/80">
              {photo.error.message}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }

  if (photo.state === "lost") {
    return (
      <View className="absolute inset-0 items-center justify-center bg-black/40">
        <Icon as={AlertTriangle} className="size-6 text-warning-500" />
        <Text className="mt-1 text-xs text-white">Lost</Text>
      </View>
    );
  }

  return null;
}
