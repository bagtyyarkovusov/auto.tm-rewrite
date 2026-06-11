const PHOTO_GRID_COLUMNS = 3;
const PHOTO_GRID_GAP = 8;

export function getPhotoTileSize(screenWidth: number): number {
  return Math.max(84, Math.min(136, Math.floor((screenWidth - 56) / 3)));
}

export function getDragTargetIndex({
  fromIndex,
  dx,
  dy,
  count,
  tileSize,
}: {
  fromIndex: number;
  dx: number;
  dy: number;
  count: number;
  tileSize: number;
}): number {
  const stride = tileSize + PHOTO_GRID_GAP;
  const fromColumn = fromIndex % PHOTO_GRID_COLUMNS;
  const fromRow = Math.floor(fromIndex / PHOTO_GRID_COLUMNS);
  const targetColumn = clamp(
    Math.round(fromColumn + dx / stride),
    0,
    PHOTO_GRID_COLUMNS - 1,
  );
  const targetRow = Math.max(0, Math.round(fromRow + dy / stride));
  return clamp(targetRow * PHOTO_GRID_COLUMNS + targetColumn, 0, count - 1);
}

export function reorderPhotoIdsByIndex(
  photoIds: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (fromIndex === toIndex) return photoIds;
  const next = [...photoIds];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return photoIds;
  next.splice(toIndex, 0, item);
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
