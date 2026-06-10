import { buildVariantUrl } from "../detail/buildVariantUrl";

import type { StagedPhoto } from "./types";

/**
 * Return the best available URI for a staged photo.
 * Prefers the local compressed file; falls back to a remote CDN URL
 * when the photo has been uploaded and only the storage key is available.
 */
export function getPhotoUri(
  photo: StagedPhoto,
  variant: "thumbnail" | "list" | "detail" | "fullscreen" = "thumbnail",
): string | undefined {
  if (photo.localUri) {
    return photo.localUri;
  }
  if (photo.key) {
    const url = buildVariantUrl(photo.key, variant);
    if (url) return url;
  }
  return undefined;
}
