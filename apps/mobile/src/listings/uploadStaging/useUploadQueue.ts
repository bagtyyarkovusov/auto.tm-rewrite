import { useCallback, useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { usePresignUpload } from "../../api/uploads/usePresignUpload";

import { setupUploadResume } from "./appStateResume";
import { compressPhoto } from "./compressor";
import {
  computePublishGate,
  reconstructQueueFromDraft,
  removePhotoFromQueue,
  reorderPhotos as reorderPhotosInQueue,
  updatePhotoState,
} from "./queueState";
import {
  ensureDraftDir,
  getDraftDir,
  getStagingPath,
} from "./stagingDir";
import type { PublishGateResult, UploadQueue } from "./types";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function listLocalPhotoIds(draftId: string): Promise<string[]> {
  const dir = getDraftDir(draftId);
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    return [];
  }
  const files = await FileSystem.readDirectoryAsync(dir);
  return files
    .filter((f) => f.endsWith(".jpg"))
    .map((f) => f.replace(".jpg", ""));
}

export function useUploadQueue(
  draftId: string,
  initialPayload: ListingsSchemas.ListingDraftPayload,
) {
  const [queue, setQueue] = useState<UploadQueue>({ draftId, photos: [] });
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const presignMutation = usePresignUpload();

  // Refs to avoid stale closures in async callbacks
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Initialize queue from draft + local files
  useEffect(() => {
    async function init() {
      const localPhotoIds = await listLocalPhotoIds(draftId);
      const reconstructed = reconstructQueueFromDraft(
        draftId,
        initialPayload,
        localPhotoIds,
      );
      setQueue(reconstructed);
    }
    void init();
  }, [draftId, initialPayload]);

  // Upload a single photo after it has been compressed
  const uploadPhoto = useCallback(
    async (photoId: string) => {
      const currentQueue = queueRef.current;
      const photo = currentQueue.photos.find((p) => p.photoId === photoId);
      if (!photo) return;

      if (!photo.localUri) {
        setQueue((prev) =>
          updatePhotoState(prev, photoId, "failed", {
            error: "Local file missing",
          }),
        );
        return;
      }

      try {
        setQueue((prev) => updatePhotoState(prev, photoId, "presigned"));
        setIsUploading(true);

        const presignResult = await presignMutation.mutateAsync({
          kind: "image",
          contentType: "image/jpeg",
          sizeBytes: photo.fileSize ?? 0,
        });

        setQueue((prev) =>
          updatePhotoState(prev, photoId, "uploading", {
            uploadUrl: presignResult.uploadUrl,
          }),
        );

        // PUT to MinIO via expo-file-system
        const uploadResult = await FileSystem.uploadAsync(
          presignResult.uploadUrl,
          photo.localUri,
          {
            httpMethod: "PUT",
            headers: {
              "Content-Type": "image/jpeg",
            },
          },
        );

        if (uploadResult.status >= 400) {
          throw new Error(`PUT failed: ${uploadResult.status}`);
        }

        setQueue((prev) =>
          updatePhotoState(prev, photoId, "uploaded", {
            key: presignResult.key,
          }),
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        setQueue((prev) =>
          updatePhotoState(prev, photoId, "failed", {
            error: errorMessage,
          }),
        );
      } finally {
        setIsUploading(false);
      }
    },
    [presignMutation],
  );

  // Resume pending uploads on app active / network available
  useEffect(() => {
    const cleanup = setupUploadResume({
      resumePendingUploads: () => {
        const currentQueue = queueRef.current;
        const photosToRetry = currentQueue.photos.filter(
          (p) =>
            p.state === "failed" ||
            p.state === "compressed" ||
            p.state === "waiting_for_network",
        );
        photosToRetry.forEach((p) => {
          void uploadPhoto(p.photoId);
        });
      },
    });
    return cleanup;
  }, [uploadPhoto]);

  const addPhoto = useCallback(
    async (sourceUri: string) => {
      const photoId = generateUUID();

      setQueue((prev) => ({
        ...prev,
        photos: [
          ...prev.photos,
          {
            photoId,
            state: "selected",
            sortOrder: prev.photos.length,
            retryCount: 0,
          },
        ],
      }));

      try {
        setIsCompressing(true);
        await ensureDraftDir(draftId);
        const destinationUri = getStagingPath(draftId, photoId);
        const compressed = await compressPhoto(sourceUri, destinationUri);
        setIsCompressing(false);

        setQueue((prev) =>
          updatePhotoState(prev, photoId, "compressed", {
            localUri: compressed.uri,
            width: compressed.width,
            height: compressed.height,
            fileSize: compressed.fileSize,
          }),
        );

        // Start upload
        await uploadPhoto(photoId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Compression failed";
        setQueue((prev) =>
          updatePhotoState(prev, photoId, "failed", {
            error: errorMessage,
          }),
        );
        setIsCompressing(false);
      }
    },
    [draftId, uploadPhoto],
  );

  const removePhoto = useCallback(
    (photoId: string) => {
      const currentQueue = queueRef.current;
      const photo = currentQueue.photos.find((p) => p.photoId === photoId);
      if (photo?.localUri) {
        void FileSystem.deleteAsync(photo.localUri, { idempotent: true });
      }
      setQueue((prev) => removePhotoFromQueue(prev, photoId));
    },
    [],
  );

  const reorderPhotos = useCallback(
    (photoIds: string[]) => {
      setQueue((prev) => reorderPhotosInQueue(prev, photoIds));
    },
    [],
  );

  const retryPhoto = useCallback(
    (photoId: string) => {
      void uploadPhoto(photoId);
    },
    [uploadPhoto],
  );

  const publishGate: PublishGateResult = computePublishGate(queue);
  const photos = queue.photos;

  return {
    photos,
    addPhoto,
    removePhoto,
    reorderPhotos,
    retryPhoto,
    publishGate,
    isCompressing,
    isUploading,
  };
}
