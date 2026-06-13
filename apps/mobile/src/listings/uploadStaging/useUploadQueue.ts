import { useCallback, useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { useTranslation } from "react-i18next";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { usePresignUpload } from "../../api/uploads/usePresignUpload";
import { ApiError } from "../../api/client";

import { setupUploadResume } from "./appStateResume";
import { useAsyncCounter } from "./useAsyncCounter";
import { compressPhoto, CompressionError } from "./compressor";
import {
  computePublishGate,
  reconstructQueueFromDraft,
  removePhotoFromQueue,
  reorderPhotos as reorderPhotosInQueue,
  updatePhotoState,
  transitionPhotoToFailed,
  createStagedPhoto,
  appendPhotoToQueue,
  findPhotoById,
  collectPhotosToResume,
  transitionUploadQueueToWaitingForNetwork,
} from "./queueState";
import {
  ensureDraftDir,
  getStagingPath,
  listLocalPhotoIds,
} from "./stagingDir";
import { buildUploadError } from "./uploadErrors";
import type { PublishGateResult, UploadQueue, UploadError } from "./types";
export { reconstructQueueFromListing } from "./queueState";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function verifyStagingFileExists(localUri: string): Promise<boolean> {
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  return fileInfo.exists;
}

const UPLOAD_TIMEOUT_MS = 60_000;

async function uploadFileToPresignedUrl(
  uploadUrl: string,
  localUri: string,
): Promise<void> {
  const uploadPromise = FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": "image/jpeg",
    },
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new ApiError("NETWORK_ERROR", 0, "Upload timed out")),
      UPLOAD_TIMEOUT_MS,
    ),
  );

  const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);

  if (uploadResult.status >= 400) {
    throw new Error(`PUT failed: ${uploadResult.status}`);
  }
}

export function useUploadQueue(
  stagingKey: string,
  initialPayload: ListingsSchemas.ListingDraftPayload,
) {
  const { t } = useTranslation("common");
  const [queue, setQueue] = useState<UploadQueue>({ stagingKey, photos: [] });
  const { increment: startCompression, decrement: endCompression, isActive: isCompressing } = useAsyncCounter();
  const { increment: startUpload, decrement: endUpload, isActive: isUploading } = useAsyncCounter();

  const initializedStagingKey = useRef<string | null>(null);
  const activeStagingKey = useRef(stagingKey);
  const presignMutation = usePresignUpload();
  const queueRef = useRef(queue);
  queueRef.current = queue;
  activeStagingKey.current = stagingKey;

  const MAX_CONCURRENT = 2;
  const runningUploads = useRef(0);
  const uploadQueue = useRef<string[]>([]);
  const networkAvailable = useRef(true);
  const uploadPhotoRef = useRef<(photoId: string) => Promise<void>>(
    async () => {},
  );

  // Initialize queue from draft + local files
  useEffect(() => {
    if (initializedStagingKey.current === stagingKey) return;
    async function init() {
      const localPhotoIds = await listLocalPhotoIds(stagingKey);
      if (activeStagingKey.current !== stagingKey) return;
      const reconstructed = reconstructQueueFromDraft(
        stagingKey,
        initialPayload,
        localPhotoIds,
      );

      // If the user added photos before disk scanning finished, merge them in
      // so async initialization doesn't silently drop in-flight selections.
      const existing = queueRef.current.photos;
      const reconstructedIds = new Set(
        reconstructed.photos.map((p) => p.photoId),
      );
      const merged = [
        ...reconstructed.photos,
        ...existing.filter((p) => !reconstructedIds.has(p.photoId)),
      ].map((p, index) => ({ ...p, sortOrder: index }));

      queueRef.current = { stagingKey, photos: merged };
      setQueue(queueRef.current);
      initializedStagingKey.current = stagingKey;
    }
    void init();
  }, [stagingKey, initialPayload]);

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

  const transitionToFailed = useCallback((photoId: string, error: UploadError) => {
    queueRef.current = transitionPhotoToFailed(queueRef.current, photoId, error);
    setQueue(queueRef.current);
  }, []);

  const transitionToPresigned = useCallback((photoId: string) => {
    queueRef.current = updatePhotoState(queueRef.current, photoId, "presigned");
    setQueue(queueRef.current);
  }, []);

  const transitionToUploading = useCallback((photoId: string, uploadUrl: string) => {
    queueRef.current = updatePhotoState(queueRef.current, photoId, "uploading", { uploadUrl });
    setQueue(queueRef.current);
  }, []);

  const transitionToUploaded = useCallback((photoId: string, key: string) => {
    queueRef.current = updatePhotoState(queueRef.current, photoId, "uploaded", { key });
    setQueue(queueRef.current);
  }, []);

  const uploadPhoto = useCallback(
    async (photoId: string) => {
      const photo = findPhotoById(queueRef.current, photoId);
      if (!photo) return;

      if (!networkAvailable.current) {
        queueRef.current = updatePhotoState(
          queueRef.current,
          photoId,
          "waiting_for_network",
        );
        setQueue(queueRef.current);
        return;
      }

      if (!photo.localUri) {
        transitionToFailed(photoId, {
          code: "LOCAL_FILE_MISSING",
          message: t("uploadErrorLocalFileMissing"),
          retryable: false,
        });
        return;
      }

      const fileExists = await verifyStagingFileExists(photo.localUri);
      if (!fileExists) {
        transitionToFailed(photoId, {
          code: "LOCAL_FILE_MISSING",
          message: t("uploadErrorLocalFileMissing"),
          retryable: false,
        });
        return;
      }

      try {
        transitionToPresigned(photoId);
        startUpload();

        const presignResult = await presignMutation.mutateAsync({
          kind: "image",
          contentType: "image/jpeg",
          sizeBytes: photo.fileSize ?? 0,
        });

        if (!networkAvailable.current) {
          queueRef.current = updatePhotoState(
            queueRef.current,
            photoId,
            "waiting_for_network",
            { uploadUrl: presignResult.uploadUrl },
          );
          setQueue(queueRef.current);
          return;
        }

        transitionToUploading(photoId, presignResult.uploadUrl);
        await uploadFileToPresignedUrl(presignResult.uploadUrl, photo.localUri);
        transitionToUploaded(photoId, presignResult.key);
      } catch (err) {
        const uploadError = buildUploadError(err, t);
        transitionToFailed(photoId, uploadError);
      } finally {
        endUpload();
      }
    },
    [presignMutation, transitionToFailed, transitionToPresigned, transitionToUploading, transitionToUploaded],
  );

  uploadPhotoRef.current = uploadPhoto;

  // Resume pending uploads on app active / network available
  useEffect(() => {
    const cleanup = setupUploadResume({
      resumePendingUploads: () => {
        const photosToRetry = collectPhotosToResume(queueRef.current);
        if (photosToRetry.length === 0) return;
        uploadQueue.current.push(...photosToRetry.map((p) => p.photoId));
        processUploadQueue();
      },
      onNetworkAvailable: () => {
        networkAvailable.current = true;
      },
      onNetworkUnavailable: () => {
        networkAvailable.current = false;
        uploadQueue.current = [];
        queueRef.current = transitionUploadQueueToWaitingForNetwork(
          queueRef.current,
        );
        setQueue(queueRef.current);
      },
    });
    return cleanup;
  }, [processUploadQueue]);

  const addPhoto = useCallback(
    async (sourceUri: string) => {
      const photoId = generateUUID();
      const nextSortOrder = queueRef.current.photos.length;

      queueRef.current = appendPhotoToQueue(
        queueRef.current,
        createStagedPhoto(photoId, nextSortOrder),
      );
      setQueue(queueRef.current);

      try {
        startCompression();
        await ensureDraftDir(stagingKey);
        const destinationUri = getStagingPath(stagingKey, photoId);
        const compressed = await compressPhoto(sourceUri, destinationUri);

        const destExists = await verifyStagingFileExists(destinationUri);
        if (!destExists) {
          throw new CompressionError(
            "Photo file missing — please remove and re-select",
            "DESTINATION_MISSING",
          );
        }

        queueRef.current = updatePhotoState(queueRef.current, photoId, "compressed", {
          localUri: compressed.uri,
          width: compressed.width,
          height: compressed.height,
          fileSize: compressed.fileSize,
        });
        setQueue(queueRef.current);

        uploadQueue.current.push(photoId);
        processUploadQueue();
      } catch (err) {
        const uploadError = buildUploadError(err, t);
        queueRef.current = transitionPhotoToFailed(queueRef.current, photoId, uploadError);
        setQueue(queueRef.current);
      } finally {
        endCompression();
      }
    },
    [stagingKey, processUploadQueue, startCompression, endCompression],
  );

  const removePhoto = useCallback(
    (photoId: string) => {
      const photo = findPhotoById(queueRef.current, photoId);
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
