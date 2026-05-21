import type { ListingsSchemas } from "@auto-tm/contracts";

import type { StagedPhoto, UploadQueue, PublishGateResult, UploadError } from "./types";

export function computePublishGate(queue: UploadQueue): PublishGateResult {
  const blockers: string[] = [];

  const hasPhotos = queue.photos.length > 0;
  if (!hasPhotos) {
    blockers.push("At least one photo is required");
  }

  const hasPending = queue.photos.some(
    (p) =>
      p.state === "selected" ||
      p.state === "compressed" ||
      p.state === "presigned" ||
      p.state === "uploading",
  );
  if (hasPending) {
    blockers.push("Some uploads are still in progress");
  }

  const hasFailed = queue.photos.some((p) => p.state === "failed");
  if (hasFailed) {
    blockers.push("Some uploads failed — retry or remove them");
  }

  const hasAttached = queue.photos.some(
    (p) => p.state === "attached" || p.state === "uploaded",
  );
  if (!hasAttached && hasPhotos) {
    blockers.push("At least one photo must be successfully attached");
  }

  return {
    canPublish: blockers.length === 0,
    blockers,
  };
}

export function reconstructQueueFromDraft(
  stagingKey: string,
  draftPayload: ListingsSchemas.ListingDraftPayload,
  localPhotoIds: string[],
): UploadQueue {
  const photos: StagedPhoto[] = [];
  const payloadPhotos = draftPayload.photos ?? [];

  for (const payloadPhoto of payloadPhotos) {
    const isLocal = localPhotoIds.includes(payloadPhoto.photoId);
    let state: StagedPhoto["state"];

    if (payloadPhoto.key) {
      state = "attached";
    } else if (isLocal) {
      state = "compressed";
    } else {
      state = "lost";
    }

    photos.push({
      photoId: payloadPhoto.photoId,
      key: payloadPhoto.key,
      state,
      sortOrder: payloadPhoto.sortOrder,
      retryCount: 0,
    });
  }

  // Include local photos not yet in payload
  for (const localId of localPhotoIds) {
    if (!photos.some((p) => p.photoId === localId)) {
      photos.push({
        photoId: localId,
        state: "selected",
        sortOrder: photos.length,
        retryCount: 0,
      });
    }
  }

  // Re-sort by sortOrder
  photos.sort((a, b) => a.sortOrder - b.sortOrder);

  return { stagingKey, photos };
}

export function getPhotosByState(
  queue: UploadQueue,
  state: StagedPhoto["state"],
): StagedPhoto[] {
  return queue.photos.filter((p) => p.state === state);
}

export function findPhotoById(
  queue: UploadQueue,
  photoId: string,
): StagedPhoto | undefined {
  return queue.photos.find((p) => p.photoId === photoId);
}

export function createStagedPhoto(
  photoId: string,
  sortOrder: number,
): StagedPhoto {
  return {
    photoId,
    state: "selected",
    sortOrder,
    retryCount: 0,
  };
}

export function appendPhotoToQueue(
  queue: UploadQueue,
  photo: StagedPhoto,
): UploadQueue {
  return {
    ...queue,
    photos: [...queue.photos, photo],
  };
}

export function updatePhotoState(
  queue: UploadQueue,
  photoId: string,
  state: StagedPhoto["state"],
  updates?: Partial<Omit<StagedPhoto, "photoId" | "state">>,
): UploadQueue {
  return {
    ...queue,
    photos: queue.photos.map((p) =>
      p.photoId === photoId
        ? {
            ...p,
            state,
            ...updates,
            retryCount:
              state === "failed" ? p.retryCount + 1 : p.retryCount,
          }
        : p,
    ),
  };
}

export function transitionPhotoToFailed(
  queue: UploadQueue,
  photoId: string,
  error: UploadError,
): UploadQueue {
  return updatePhotoState(queue, photoId, "failed", { error });
}

export function removePhotoFromQueue(
  queue: UploadQueue,
  photoId: string,
): UploadQueue {
  return {
    ...queue,
    photos: queue.photos
      .filter((p) => p.photoId !== photoId)
      .map((p, index) => ({ ...p, sortOrder: index })),
  };
}

export function reorderPhotos(queue: UploadQueue, photoIds: string[]): UploadQueue {
  const photoMap = new Map(queue.photos.map((p) => [p.photoId, p]));
  const reordered = photoIds
    .map((id) => photoMap.get(id))
    .filter((p): p is StagedPhoto => !!p)
    .map((p, index) => ({ ...p, sortOrder: index }));

  return { ...queue, photos: reordered };
}

export function getPhotosReadyForUpload(queue: UploadQueue): StagedPhoto[] {
  return queue.photos.filter((p) => p.state === "compressed");
}

export function collectPhotosToResume(queue: UploadQueue): StagedPhoto[] {
  return queue.photos.filter(
    (p) =>
      p.state === "compressed" ||
      p.state === "waiting_for_network" ||
      (p.state === "failed" && p.retryCount < 2 && isRetryable(p.error)),
  );
}

export function transitionUploadQueueToWaitingForNetwork(
  queue: UploadQueue,
): UploadQueue {
  return {
    ...queue,
    photos: queue.photos.map((photo) =>
      photo.state === "compressed" ||
      photo.state === "presigned" ||
      photo.state === "uploading"
        ? { ...photo, state: "waiting_for_network" }
        : photo,
    ),
  };
}

export function isRetryable(error?: UploadError): boolean {
  if (!error) return true;
  return error.retryable;
}
