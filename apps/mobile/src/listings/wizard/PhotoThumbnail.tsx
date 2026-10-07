import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { Image } from "expo-image";
import { ImageIcon, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import type { StagedPhoto } from "../uploadStaging/types";
import { getPhotoUri } from "../uploadStaging/photoUri";

import { photoPosition, photoTileDescription } from "./photoLabels";
import { PhotoStateOverlay } from "./PhotoStateOverlay";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";


interface PhotoThumbnailProps {
  photo: StagedPhoto;
  index: number;
  total: number;
  onRemove: (photoId: string) => void;
  /** A tap on the tile: open the photo's action sheet. */
  onOpenActions: (photoId: string) => void;
  onDragStart: (index: number, pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
}

export function PhotoThumbnail({
  photo,
  index,
  total,
  onRemove,
  onOpenActions,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  dragOffset = { x: 0, y: 0 },
}: PhotoThumbnailProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [imageFailed, setImageFailed] = useState(false);
  const uri = getPhotoUri(photo);
  const tileSize = Math.max(
    84,
    Math.min(136, Math.floor((width - 56) / 3)),
  );
  const handleLongPress = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    onDragStart(index, pageX, pageY);
  };
  const handleTouchMove = (event: GestureResponderEvent) => {
    const touch = event.nativeEvent.touches[0];
    if (!touch) return;
    onDragMove(touch.pageX, touch.pageY);
  };

  return (
    <View
      key={photo.photoId}
      className="relative overflow-hidden rounded-lg bg-muted"
      style={[
        { width: tileSize, height: tileSize },
        isDragging
          ? {
              opacity: 0.85,
              transform: [
                { translateX: dragOffset.x },
                { translateY: dragOffset.y },
                { scale: 1.04 },
              ],
              zIndex: 10,
            }
          : null,
      ]}
    >
      {/* A tap opens the sheet; a long press starts the drag, and RN skips onPress then. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={photoTileDescription(t, photo, index, total)}
        delayLongPress={250}
        onPress={() => onOpenActions(photo.photoId)}
        onLongPress={handleLongPress}
        onTouchMove={handleTouchMove}
        onPressOut={onDragEnd}
        style={StyleSheet.absoluteFillObject}
      >
        {uri && !imageFailed ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Icon as={ImageIcon} className="size-6 text-muted-foreground" />
          </View>
        )}
      </Pressable>

      {index === 0 && (
        <View
          className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text className="text-micro font-medium text-white">{t("cover")}</Text>
        </View>
      )}

      {/* The tile's label already says the state, so the overlay is for the eye only. */}
      <View
        className="absolute inset-0"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <PhotoStateOverlay photo={photo} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("remove")}: ${photoPosition(t, index, total)}`}
        className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/60"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => onRemove(photo.photoId)}
      >
        <Icon as={X} className="size-4 text-white" />
      </Pressable>
    </View>
  );
}
