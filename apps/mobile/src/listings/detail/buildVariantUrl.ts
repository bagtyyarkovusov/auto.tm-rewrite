const MEDIA_URL = (
  process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""
).replace(/\/$/, "");

export function buildVariantUrl(
  key: string,
  variant: "thumbnail" | "list" | "detail" | "fullscreen",
): string {
  if (!MEDIA_URL) return "";
  if (key.endsWith(".mp4") || key.endsWith(".mov")) {
    return `${MEDIA_URL}/${key}`;
  }
  const base = key.replace(/\/original\.(jpg|webp|jpeg)$/, "");
  return `${MEDIA_URL}/${base}/${variant}.jpg`;
}
