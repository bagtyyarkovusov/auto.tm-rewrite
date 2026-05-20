import { useCallback } from "react";
import {
  View,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  Camera,
  ImagePlus,
} from "lucide-react-native";

import type { StagedPhoto } from "../uploadStaging/types";

import type { WizardPayload } from "./types";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

import { PhotoThumbnail } from "./PhotoThumbnail";

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
  fieldErrors?: Record<string, string>;
}

function usePhotoPicker(onAddPhoto: (uri: string) => Promise<void>) {
  const ensurePickerTempDir = useCallback(async () => {
    const dir = `${FileSystem.documentDirectory}picker-temp/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  }, []);

  const copyToPickerTemp = useCallback(
    async (sourceUri: string): Promise<string> => {
      const dir = await ensurePickerTempDir();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const destUri = `${dir}${fileName}`;
      await FileSystem.copyAsync({ from: sourceUri, to: destUri });
      return destUri;
    },
    [ensurePickerTempDir],
  );

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      const copiedUris = await Promise.all(
        result.assets.map((asset) => copyToPickerTemp(asset.uri)),
      );
      await Promise.all(
        copiedUris.map(async (uri) => {
          try {
            await onAddPhoto(uri);
          } finally {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          }
        }),
      );
    }
  }, [onAddPhoto, copyToPickerTemp]);

  const takePhoto = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = await copyToPickerTemp(result.assets[0].uri);
      try {
        await onAddPhoto(uri);
      } finally {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    }
  }, [onAddPhoto, copyToPickerTemp]);

  return { pickFromLibrary, takePhoto };
}

function usePhotoReorder(
  photos: StagedPhoto[],
  onReorderPhotos: (photoIds: string[]) => void,
) {
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newOrder = [...photos];
      const tmp = newOrder[index] as StagedPhoto;
      newOrder[index] = newOrder[index - 1] as StagedPhoto;
      newOrder[index - 1] = tmp;
      onReorderPhotos(newOrder.map((p) => p.photoId));
    },
    [photos, onReorderPhotos],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= photos.length - 1) return;
      const newOrder = [...photos];
      const tmp = newOrder[index] as StagedPhoto;
      newOrder[index] = newOrder[index + 1] as StagedPhoto;
      newOrder[index + 1] = tmp;
      onReorderPhotos(newOrder.map((p) => p.photoId));
    },
    [photos, onReorderPhotos],
  );

  const handleSetAsCover = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newOrder = [...photos];
      const item = newOrder.splice(index, 1)[0] as StagedPhoto;
      newOrder.unshift(item);
      onReorderPhotos(newOrder.map((p) => p.photoId));
    },
    [photos, onReorderPhotos],
  );

  return { handleMoveUp, handleMoveDown, handleSetAsCover };
}

function PhotoActions({
  disabled,
  maxReached,
  onTakePhoto,
  onPickFromLibrary,
}: {
  disabled: boolean;
  maxReached: boolean;
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
}) {
  return (
    <View className="flex-row gap-3">
      <Button
        variant="outline"
        className="flex-1"
        onPress={onTakePhoto}
        disabled={disabled || maxReached}
      >
        <Icon as={Camera} className="size-4" />
        <Text>Camera</Text>
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        onPress={onPickFromLibrary}
        disabled={disabled || maxReached}
      >
        <Icon as={ImagePlus} className="size-4" />
        <Text>Library</Text>
      </Button>
    </View>
  );
}

function PhotoGrid({
  photos,
  disabled,
  onRetry,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSetAsCover,
}: {
  photos: StagedPhoto[];
  disabled: boolean;
  onRetry: (photoId: string) => void;
  onRemove: (photoId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSetAsCover: (index: number) => void;
}) {
  return (
    <View className={`flex-row flex-wrap gap-2 ${disabled ? "opacity-50" : ""}`}>
      {photos.map((photo, index) => (
        <PhotoThumbnail
          key={photo.photoId}
          photo={photo}
          index={index}
          total={photos.length}
          onRetry={onRetry}
          onRemove={onRemove}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onSetAsCover={onSetAsCover}
        />
      ))}
    </View>
  );
}

function StatusIndicator({
  isCompressing,
  isUploading,
}: {
  isCompressing: boolean;
  isUploading: boolean;
}) {
  if (!isCompressing && !isUploading) return null;
  return (
    <View className="flex-row items-center gap-2">
      <ActivityIndicator size="small" />
      <Text className="text-sm text-muted-foreground">
        {isCompressing ? "Compressing..." : "Uploading..."}
      </Text>
    </View>
  );
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
  fieldErrors,
}: Step2PhotosProps) {
  const { pickFromLibrary, takePhoto } = usePhotoPicker(onAddPhoto);
  const { handleMoveUp, handleMoveDown, handleSetAsCover } = usePhotoReorder(
    photos,
    onReorderPhotos,
  );

  const maxReached = photos.length >= 20;
  const photosError = fieldErrors?.photos;

  return (
    <View className="gap-4 py-4">
      <Text className="text-sm text-muted-foreground">
        Photos under 5 MB upload faster.
      </Text>

      <PhotoActions
        disabled={disabled ?? false}
        maxReached={maxReached}
        onTakePhoto={takePhoto}
        onPickFromLibrary={pickFromLibrary}
      />

      {photosError && (
        <Text className="text-sm text-destructive">{photosError}</Text>
      )}

      {maxReached && (
        <Text className="text-sm text-muted-foreground">
          Maximum 20 photos reached
        </Text>
      )}

      <StatusIndicator isCompressing={isCompressing} isUploading={isUploading} />

      <PhotoGrid
        photos={photos}
        disabled={disabled ?? false}
        onRetry={onRetryPhoto}
        onRemove={onRemovePhoto}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onSetAsCover={handleSetAsCover}
      />
    </View>
  );
}
