import { useCallback } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  ImagePlus,
  Check,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Image as ImageIcon,
  X,
} from "lucide-react-native";

import type { StagedPhoto } from "../uploadStaging/types";

import type { WizardPayload } from "./types";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface Step2PhotosProps {
  payload: WizardPayload;
  onChange: (updates: Partial<WizardPayload>) => void;
  disabled?: boolean;
  disabledTooltip?: string;
  photos: StagedPhoto[];
  onAddPhoto: (uri: string) => Promise<void>;
  onRemovePhoto: (photoId: string) => void;
  onReorderPhotos: (photoIds: string[]) => void;
  onRetryPhoto: (photoId: string) => void;
  isCompressing: boolean;
  isUploading: boolean;
}

export default function Step2Photos({
  photos,
  onAddPhoto,
  onRemovePhoto,
  onReorderPhotos,
  onRetryPhoto,
  isCompressing,
  isUploading,
  disabled,
}: Step2PhotosProps) {
  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      for (const asset of result.assets) {
        await onAddPhoto(asset.uri);
      }
    }
  }, [onAddPhoto]);

  const takePhoto = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      await onAddPhoto(result.assets[0].uri);
    }
  }, [onAddPhoto]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newOrder = [...photos];
    const tmp = newOrder[index] as StagedPhoto;
    newOrder[index] = newOrder[index - 1] as StagedPhoto;
    newOrder[index - 1] = tmp;
    onReorderPhotos(newOrder.map((p) => p.photoId));
  }, [photos, onReorderPhotos]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= photos.length - 1) return;
    const newOrder = [...photos];
    const tmp = newOrder[index] as StagedPhoto;
    newOrder[index] = newOrder[index + 1] as StagedPhoto;
    newOrder[index + 1] = tmp;
    onReorderPhotos(newOrder.map((p) => p.photoId));
  }, [photos, onReorderPhotos]);

  const handleSetAsCover = useCallback((index: number) => {
    if (index === 0) return;
    const newOrder = [...photos];
    const item = newOrder.splice(index, 1)[0] as StagedPhoto;
    newOrder.unshift(item);
    onReorderPhotos(newOrder.map((p) => p.photoId));
  }, [photos, onReorderPhotos]);

  const maxReached = photos.length >= 20;
  const hasPhotos = photos.length >= 1;

  return (
    <View className="gap-4 py-4">
      {/* Camera + Library buttons */}
      <View className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onPress={takePhoto}
          disabled={disabled || maxReached}
        >
          <Icon as={Camera} className="size-4" />
          <Text>Camera</Text>
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onPress={pickFromLibrary}
          disabled={disabled || maxReached}
        >
          <Icon as={ImagePlus} className="size-4" />
          <Text>Library</Text>
        </Button>
      </View>

      {!hasPhotos && (
        <Text className="text-sm text-muted-foreground">
          At least 1 photo required
        </Text>
      )}

      {maxReached && (
        <Text className="text-sm text-muted-foreground">
          Maximum 20 photos reached
        </Text>
      )}

      {(isCompressing || isUploading) && (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" />
          <Text className="text-sm text-muted-foreground">
            {isCompressing ? "Compressing..." : "Uploading..."}
          </Text>
        </View>
      )}

      {/* Thumbnail grid */}
      <View
        className={`flex-row flex-wrap gap-2 ${disabled ? "opacity-50" : ""}`}
      >
        {photos.map((photo, index) => (
          <View
            key={photo.photoId}
            className="relative aspect-square w-[48%] overflow-hidden rounded-lg bg-muted"
          >
            {/* Thumbnail image */}
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

            {/* selected */}
            {photo.state === "selected" && (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <ActivityIndicator color="white" />
              </View>
            )}

            {/* compressed */}
            {photo.state === "compressed" && (
              <View className="absolute right-1 top-1 rounded-full bg-black/40 p-1">
                <ActivityIndicator size="small" color="white" />
              </View>
            )}

            {/* presigned / uploading */}
            {(photo.state === "presigned" || photo.state === "uploading") && (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <ActivityIndicator color="white" />
                <Text className="mt-1 text-xs text-white">Uploading</Text>
              </View>
            )}

            {/* uploaded / attached */}
            {(photo.state === "uploaded" || photo.state === "attached") && (
              <>
                <View className="absolute right-1 top-1 rounded-full bg-primary p-1">
                  <Icon
                    as={Check}
                    className="size-3 text-primary-foreground"
                  />
                </View>
                {index === 0 && (
                  <View className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5">
                    <Text className="text-[10px] font-medium text-primary-foreground">
                      Cover
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* failed */}
            {photo.state === "failed" && (
              <Pressable
                className="absolute inset-0 items-center justify-center bg-black/50"
                onPress={() => {
                  if (photo.error?.retryable !== false) {
                    onRetryPhoto(photo.photoId);
                  }
                }}
              >
                <View className="items-center gap-1">
                  {photo.error?.retryable === false ? (
                    <>
                      <Icon as={X} className="size-6 text-red-400" />
                      <Text className="text-xs text-red-400">Failed</Text>
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
            )}

            {/* lost */}
            {photo.state === "lost" && (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <Icon
                  as={AlertTriangle}
                  className="size-6 text-yellow-400"
                />
                <Text className="mt-1 text-xs text-white">Lost</Text>
              </View>
            )}

            {/* Menu button */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <View className="absolute bottom-1 right-1 h-8 w-8 items-center justify-center rounded-full bg-black/40">
                  <Icon as={MoreVertical} className="size-4 text-white" />
                </View>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  disabled={index === 0}
                  onPress={() => handleMoveUp(index)}
                >
                  <Text>Move up</Text>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === photos.length - 1}
                  onPress={() => handleMoveDown(index)}
                >
                  <Text>Move down</Text>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === 0}
                  onPress={() => handleSetAsCover(index)}
                >
                  <Text>Set as cover</Text>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onPress={() => onRemovePhoto(photo.photoId)}
                >
                  <Text>Remove</Text>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        ))}
      </View>
    </View>
  );
}
