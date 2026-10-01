/** How far a photo zooms in, as a multiple of its fitted size. */
export const MAX_ZOOM = 4;

const DOUBLE_TAP_ZOOM = 2.5;

/** A photo never shrinks below fitted size or grows past `MAX_ZOOM`. */
export function clampScale(scale: number): number {
  "worklet";
  return Math.min(Math.max(scale, 1), MAX_ZOOM);
}

/**
 * Keeps a zoomed photo's edge from leaving the frame: at `scale` a side of
 * `size` is `size * scale` long, so each edge may sit at most half the extra
 * length from centre. A fitted photo cannot move at all.
 */
export function clampTranslation(
  translation: number,
  scale: number,
  size: number,
): number {
  "worklet";
  const limit = (size * (scale - 1)) / 2;
  if (limit <= 0) return 0;
  return Math.min(Math.max(translation, -limit), limit);
}

/** Double-tap zooms a fitted photo in and any zoomed photo back to fitted. */
export function doubleTapScale(current: number): number {
  "worklet";
  return current > 1 ? 1 : DOUBLE_TAP_ZOOM;
}
