import { useCallback, useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { usePresignUpload } from "../../api/uploads/usePresignUpload";
import { ApiError } from "../../api/client";

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

  // Concurrency limit: max 2 simultaneous uploads
  const MAX_CONCURRENT = 2;
  const runningUploads = useRef(0);
  const uploadQueue = useRef<string[]>([]);
  const uploadPhotoRef = useRef<(photoId: string) => Promise<void>>(
    async () => {},
  );

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

  // Process the next items in the upload queue
  const processUploadQueue = useCallback(() => {
    while (
      runningUploads.current < MAX_CONCURRENT &&
      uploadQueue.current.length > 0
    ) {
      const nextId = uploadQueue.current.shift();
      if (!nextId) continue;
      runningUploads.current += 1;
      uploadPhotoRef.current(nextId).finally(() => {
        runningUploads.current -= 1;
        processUploadQueue();
      });
    }
  }, []);

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

        // PUT raw binary to MinIO via expo-file-system
        const uploadResult = await FileSystem.uploadAsync(
          presignResult.uploadUrl,
          photo.localUri,
          {
            httpMethod: "PUT",
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
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
        let errorMessage = err instanceof Error ? err.message : "Upload failed";
        if (err instanceof ApiError && err.status === 429) {
          errorMessage = "Rate limited — please retry in a moment";
        }
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

  // Keep uploadPhotoRef in sync so processUploadQueue always calls the latest version
  uploadPhotoRef.current = uploadPhoto;

  // Resume pending uploads on app active / network available
  useEffect(() => {
    const cleanup = setupUploadResume({
      resumePendingUploads: () => {
        const currentQueue = queueRef.current;
        const photosToRetry = currentQueue.photos.filter(
          (p) =>
            (p.state === "compressed" || p.state === "waiting_for_network") ||
            (p.state === "failed" &&
              p.retryCount < 2 &&
              !p.error?.includes("Rate limited")),
        );
        if (photosToRetry.length === 0) return;
        uploadQueue.current.push(...photosToRetry.map((p) => p.photoId));
        processUploadQueue();
      },
    });
    return cleanup;
  }, [processUploadQueue]);

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

        // Update ref synchronously so uploadPhoto sees localUri immediately
        queueRef.current = updatePhotoState(queueRef.current, photoId, "compressed", {
          localUri: compressed.uri,
          width: compressed.width,
          height: compressed.height,
          fileSize: compressed.fileSize,
        });
        setQueue(queueRef.current);

        // Enqueue upload (respects max concurrency)
        uploadQueue.current.push(photoId);
        processUploadQueue();
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
      uploadQueue.current.push(photoId);
      processUploadQueue();
    },
    [processUploadQueue],
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
