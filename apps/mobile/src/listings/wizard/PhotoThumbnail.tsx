import { View, Image } from "react-native";
import { Image as ImageIcon, MoreVertical } from "lucide-react-native";

import type { StagedPhoto } from "../uploadStaging/types";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PhotoStateOverlay } from "./PhotoStateOverlay";

interface PhotoThumbnailProps {
  photo: StagedPhoto;
  index: number;
  total: number;
  onRetry: (photoId: string) => void;
  onRemove: (photoId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSetAsCover: (index: number) => void;
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
}: PhotoThumbnailProps) {
  return (
    <View
      key={photo.photoId}
      className="relative aspect-square w-[48%] overflow-hidden rounded-lg bg-muted"
    >
      {photo.localUri ? (
        <Image
          source={{ uri: photo.localUri }}
          className="h-full w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Icon as={ImageIcon} className="size-8 text-muted-foreground" />
        </View>
      )}

      <PhotoStateOverlay photo={photo} index={index} onRetry={onRetry} />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <View className="absolute bottom-1 right-1 h-8 w-8 items-center justify-center rounded-full bg-black/40">
            <Icon as={MoreVertical} className="size-4 text-white" />
          </View>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            disabled={index === 0}
            onPress={() => onMoveUp(index)}
          >
            <Text>Move up</Text>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === total - 1}
            onPress={() => onMoveDown(index)}
          >
            <Text>Move down</Text>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === 0}
            onPress={() => onSetAsCover(index)}
          >
            <Text>Set as cover</Text>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onPress={() => onRemove(photo.photoId)}
          >
            <Text>Remove</Text>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}
