/** Placeholder: the red checkpoint's tests fail until the zoom rules land. */
export const MAX_ZOOM = 1;

export function clampScale(scale: number): number {
  return scale;
}

export function clampTranslation(
  translation: number,
  _scale: number,
  _size: number,
): number {
  return translation;
}

export function doubleTapScale(current: number): number {
  return current;
}
