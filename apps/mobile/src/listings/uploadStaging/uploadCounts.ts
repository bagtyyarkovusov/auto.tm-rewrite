import type { PhotoState, StagedPhoto } from "./types";

/**
 * States of a photo whose upload has not finished and has not failed. A photo
 * waiting for the network counts: it has no key yet and uploads when the network
 * returns, so Publish waits for it too.
 */
export const PENDING_STATES: readonly PhotoState[] = [
  "selected",
  "compressed",
  "presigned",
  "uploading",
  "waiting_for_network",
];

/** States that need the seller to act: retry the photo, or remove it. */
export const NEEDS_ATTENTION_STATES: readonly PhotoState[] = ["failed", "lost"];

export interface UploadCounts {
  /** Photos still on their way: compressing, queued, uploading or waiting for network. */
  inflight: number;
  /** Photos that failed or were lost. */
  failed: number;
  total: number;
}

export function countUploads(photos: readonly StagedPhoto[]): UploadCounts {
  return {
    inflight: photos.filter((p) => PENDING_STATES.includes(p.state)).length,
    failed: photos.filter((p) => NEEDS_ATTENTION_STATES.includes(p.state)).length,
    total: photos.length,
  };
}
