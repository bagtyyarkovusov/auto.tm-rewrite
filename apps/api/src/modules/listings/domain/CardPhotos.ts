import type { MediaKind } from "./types";

/** Card surfaces carry at most this many photo keys; `photoCount` carries the total. */
export const CARD_PHOTO_KEY_LIMIT = 2;

/** The Results photo strip carries at most this many photo keys. */
export const CARD_GALLERY_KEY_LIMIT = 8;

export interface CardPhotos {
  /** First media key of any kind, kept for conversations and owner cards. */
  coverMediaKey?: string;
  /** Keys of the first photos (`image` media) in `sortOrder`, capped at `CARD_PHOTO_KEY_LIMIT`. */
  photoKeys: string[];
  /** Keys of the first photos in `sortOrder`, capped at `CARD_GALLERY_KEY_LIMIT`. */
  galleryKeys: string[];
  photoCount: number;
}

/**
 * Derives the card photo fields from a Listing's media.
 * `media` must already be ordered by `sortOrder` ascending. It may be only the
 * first media item plus the first `CARD_GALLERY_KEY_LIMIT` photos, as a
 * bounded read returns; then pass the Listing's total `photoCount`, which
 * otherwise is the number of photos in `media`.
 */
export function toCardPhotos(
  media: ReadonlyArray<{ key: string; kind: MediaKind }>,
  photoCount?: number,
): CardPhotos {
  const photoKeys = media.filter((m) => m.kind === "image").map((m) => m.key);
  const cover = media[0]?.key;

  return {
    ...(cover ? { coverMediaKey: cover } : {}),
    photoKeys: photoKeys.slice(0, CARD_PHOTO_KEY_LIMIT),
    galleryKeys: photoKeys.slice(0, CARD_GALLERY_KEY_LIMIT),
    photoCount: photoCount ?? photoKeys.length,
  };
}
