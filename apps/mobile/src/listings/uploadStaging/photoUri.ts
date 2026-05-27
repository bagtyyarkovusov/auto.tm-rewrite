import type { StagedPhoto } from "./types";

const MEDIA_URL = (
  process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""
).replace(/\/$/, "");

/**
 * Build a public image-variant URL from a storage key.
 * Mirrors the server-side `buildVariants` logic in GetListingDetail.ts.
 */
function buildVariantUrl(key: string, variant: "thumbnail" | "list" | "detail" | "fullscreen"): string {
  if (!MEDIA_URL) return "";

  if (key.endsWith(".mp4") || key.endsWith(".mov")) {
    return `${MEDIA_URL}/${key}`;
  }

  const base = key.replace(/\/original\.(jpg|webp|jpeg)$/, "");
  return `${MEDIA_URL}/${base}/${variant}.jpg`;
}

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
