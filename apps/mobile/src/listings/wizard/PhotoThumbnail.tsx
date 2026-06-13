import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { Image } from "expo-image";
import { ImageIcon, MoreVertical, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import type { StagedPhoto } from "../uploadStaging/types";
import { getPhotoUri } from "../uploadStaging/photoUri";

import { PhotoStateOverlay } from "./PhotoStateOverlay";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface PhotoThumbnailProps {
  photo: StagedPhoto;
  index: number;
  total: number;
  onRetry: (photoId: string) => void;
  onRemove: (photoId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSetAsCover: (index: number) => void;
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
  onRetry,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSetAsCover,
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
      <Pressable
        delayLongPress={250}
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
        <View className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5">
          <Text className="text-[10px] font-medium text-white">{t("cover")}</Text>
        </View>
      )}

      <PhotoStateOverlay photo={photo} onRetry={onRetry} />

      <Pressable
        accessibilityLabel={t("remove")}
        className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/60"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => onRemove(photo.photoId)}
      >
        <Icon as={X} className="size-4 text-white" />
      </Pressable>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <View className="absolute bottom-1.5 right-1.5 h-11 w-11 items-center justify-center rounded-full bg-black/40">
            <Icon as={MoreVertical} className="size-3.5 text-white" />
          </View>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            disabled={index === 0}
            onPress={() => onMoveUp(index)}
          >
            <Text>{t("moveUp")}</Text>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === total - 1}
            onPress={() => onMoveDown(index)}
          >
            <Text>{t("moveDown")}</Text>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === 0}
            onPress={() => onSetAsCover(index)}
          >
            <Text>{t("setAsCover")}</Text>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onPress={() => onRemove(photo.photoId)}
          >
            <Text>{t("remove")}</Text>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}
