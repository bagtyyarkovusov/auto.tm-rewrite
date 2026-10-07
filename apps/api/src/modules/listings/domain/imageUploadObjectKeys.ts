import { mediaCleanupPrefix } from "./mediaCleanupPrefix";

/** The complete, fixed set initialized before conditional image upload authority exists. */
export function imageUploadObjectKeys(key: string): string[] {
  const prefix = mediaCleanupPrefix(key);
  if (!prefix || !/\/original\.(jpg|webp)$/.test(key)) {
    throw new Error("Conditional upload requires a fresh Listing image key");
  }
  return [key, ...["thumbnail", "list", "detail", "fullscreen"].flatMap((name) => [
    `${prefix}${name}.jpg`, `${prefix}${name}.webp`,
  ])];
}
