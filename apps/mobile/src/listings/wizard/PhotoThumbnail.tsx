import { View, Image } from "react-native";
import { ImageIcon, MoreVertical } from "lucide-react-native";

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
      className="relative aspect-square w-[31.5%] overflow-hidden rounded-lg bg-muted"
    >
      {getPhotoUri(photo) ? (
        <Image
          source={{ uri: getPhotoUri(photo) }}
          className="h-full w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Icon as={ImageIcon} className="size-6 text-muted-foreground" />
        </View>
      )}

      {index === 0 && (
        <View className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5">
          <Text className="text-[10px] font-medium text-white">Cover</Text>
        </View>
      )}

      <PhotoStateOverlay photo={photo} onRetry={onRetry} />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <View className="absolute bottom-1.5 right-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/40">
            <Icon as={MoreVertical} className="size-3.5 text-white" />
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
