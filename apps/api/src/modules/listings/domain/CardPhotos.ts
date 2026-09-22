import type { MediaKind } from "./types";

/** Card surfaces carry at most this many photo keys; `photoCount` carries the total. */
export const CARD_PHOTO_KEY_LIMIT = 2;

export interface CardPhotos {
  /** First media key of any kind, kept for conversations and owner cards. */
  coverMediaKey?: string;
  /** Keys of the first photos (`image` media) in `sortOrder`, capped at `CARD_PHOTO_KEY_LIMIT`. */
  photoKeys: string[];
  photoCount: number;
}

/**
 * Derives the card photo fields from a Listing's media.
 * `media` must already be ordered by `sortOrder` ascending.
 */
export function toCardPhotos(
  media: ReadonlyArray<{ key: string; kind: MediaKind }>,
): CardPhotos {
  const photoKeys = media.filter((m) => m.kind === "image").map((m) => m.key);
  const cover = media[0]?.key;

  return {
    ...(cover ? { coverMediaKey: cover } : {}),
    photoKeys: photoKeys.slice(0, CARD_PHOTO_KEY_LIMIT),
    photoCount: photoKeys.length,
  };
}
