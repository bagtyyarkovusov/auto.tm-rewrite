/** Only Listing presign's UUID v4 directories can authorize derivative cleanup. */
export function mediaCleanupPrefix(key: string): string | null {
  const match = /^(pending\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/)original\.(jpg|webp|mp4)$/.exec(key);
  return match?.[0] === key ? match[1] ?? null : null;
}
