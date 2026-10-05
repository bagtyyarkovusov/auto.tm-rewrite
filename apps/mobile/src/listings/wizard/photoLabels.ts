import type { TFunction } from "i18next";

import type { PhotoState, StagedPhoto } from "../uploadStaging/types";

/** Translation key that names a photo's upload state. */
const STATE_LABEL_KEY: Record<PhotoState, string> = {
  selected: "photoStateCompressing",
  compressed: "photoStateQueued",
  presigned: "photoStateUploading",
  uploading: "photoStateUploading",
  uploaded: "photoStateUploaded",
  attached: "photoStateUploaded",
  waiting_for_network: "waitingForNetwork",
  failed: "failed",
  lost: "lost",
};

/** "Photo 2 of 6": where the photo sits in the grid. */
export function photoPosition(t: TFunction, index: number, total: number): string {
  return t("photoTileLabel", { n: index + 1, total });
}

/**
 * What a screen reader says for a tile: its place in the grid, "Cover" on the
 * first, and its upload state ("Photo 1 of 6, Cover, Uploaded").
 */
export function photoTileDescription(
  t: TFunction,
  photo: StagedPhoto,
  index: number,
  total: number,
): string {
  return [
    photoPosition(t, index, total),
    index === 0 ? t("cover") : null,
    t(STATE_LABEL_KEY[photo.state]),
  ]
    .filter(Boolean)
    .join(", ");
}

/** The reason a failed or lost photo did not upload, in the seller's language. */
export function photoFailureReason(t: TFunction, photo: StagedPhoto): string {
  if (photo.state === "lost") return t("uploadErrorLost");
  return photo.error?.message ?? t("uploadErrorUnknown");
}

/** A failed photo can be retried unless its error says it cannot (file missing). */
export function canRetryPhoto(photo: StagedPhoto): boolean {
  return photo.state === "failed" && photo.error?.retryable !== false;
}
