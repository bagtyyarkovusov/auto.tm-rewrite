/** Cleanup may cover derivatives only in a recognized original's directory. */
export function mediaCleanupPrefix(key: string): string | null {
  const match = /^(.*\/)original\.(jpg|webp|jpeg|mp4)$/.exec(key);
  return match?.[1] ?? null;
}
