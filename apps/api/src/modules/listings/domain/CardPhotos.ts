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

type CardMedia = ReadonlyArray<{ key: string; kind: MediaKind }>;

/**
 * Derives the card photo fields from ALL of a Listing's media, ordered by
 * `sortOrder` ascending. `photoCount` is the number of photos in `media`, so
 * a truncated list belongs to `toCardPhotosFromFirstMedia`.
 */
export function toCardPhotos(media: CardMedia): CardPhotos {
  return toCardPhotosFromFirstMedia(
    media,
    media.filter((m) => m.kind === "image").length,
  );
}

/**
 * Derives the card photo fields from the start of a Listing's media, as a
 * bounded read returns it: the first media item and at least the first
 * `CARD_GALLERY_KEY_LIMIT` photos, ordered by `sortOrder` ascending.
 * `photoCount` is the Listing's photo total, which the list cannot show.
 */
export function toCardPhotosFromFirstMedia(
  firstMedia: CardMedia,
  photoCount: number,
): CardPhotos {
  const photoKeys = firstMedia.filter((m) => m.kind === "image").map((m) => m.key);
  const cover = firstMedia[0]?.key;

  return {
    ...(cover ? { coverMediaKey: cover } : {}),
    photoKeys: photoKeys.slice(0, CARD_PHOTO_KEY_LIMIT),
    galleryKeys: photoKeys.slice(0, CARD_GALLERY_KEY_LIMIT),
    photoCount,
  };
}
