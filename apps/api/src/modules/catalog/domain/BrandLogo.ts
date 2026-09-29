/**
 * Rules for an uploaded brand logo. Pure functions: the use-cases supply the
 * bytes and the decoded image facts, and these decide whether to accept them.
 * The limits and rejection reasons mirror `@auto-tm/contracts` (checked by
 * BrandLogo.spec.ts) so clients can show a message for every reason.
 */

export const BRAND_LOGO_MAX_BYTES = 200 * 1024;

/** Longest side divided by shortest side. Logos must be roughly square. */
export const BRAND_LOGO_MAX_ASPECT_RATIO = 1.25;

/** Uploaded SVGs are rendered to a PNG this many pixels on the longest side. */
export const BRAND_LOGO_RASTER_SIZE = 256;

export const BRAND_LOGO_CONTENT_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/webp",
] as const;
export type BrandLogoContentType = (typeof BRAND_LOGO_CONTENT_TYPES)[number];

/** What is stored and served. SVG is never served; it is rasterized to PNG. */
export type StoredBrandLogoType = "image/png" | "image/webp";

const FORMAT_BY_CONTENT_TYPE: Record<BrandLogoContentType, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/webp": "webp",
};

export const BRAND_LOGO_REJECTIONS = [
  "LOGO_UNSUPPORTED_TYPE",
  "LOGO_TOO_LARGE",
  "LOGO_EMPTY",
  "LOGO_UNREADABLE",
  "LOGO_TYPE_MISMATCH",
  "LOGO_NOT_SQUARE",
  "LOGO_UNSAFE_SVG",
  "LOGO_UPLOAD_MISSING",
] as const;
export type BrandLogoRejection = (typeof BRAND_LOGO_REJECTIONS)[number];

export const BRAND_LOGO_REJECTION_MESSAGES: Record<BrandLogoRejection, string> = {
  LOGO_UNSUPPORTED_TYPE: "Logo must be an SVG, PNG, or WebP file",
  LOGO_TOO_LARGE: `Logo must be at most ${BRAND_LOGO_MAX_BYTES / 1024} KB`,
  LOGO_EMPTY: "Logo file is empty",
  LOGO_UNREADABLE: "Logo file could not be read as an image",
  LOGO_TYPE_MISMATCH: "Logo file content does not match its declared type",
  LOGO_NOT_SQUARE: "Logo must be roughly square (sides within 1:1.25)",
  LOGO_UNSAFE_SVG:
    "SVG logo contains a DOCTYPE, scripts, event handlers, prefixed elements, external references, or embedded content",
  LOGO_UPLOAD_MISSING: "Uploaded logo file was not found; upload it again",
};

export function isBrandLogoContentType(value: string): value is BrandLogoContentType {
  return (BRAND_LOGO_CONTENT_TYPES as readonly string[]).includes(value);
}

/** Checks that need only the declared type and the size. */
export function checkBrandLogoFile(
  contentType: string,
  sizeBytes: number,
): BrandLogoRejection | null {
  if (!isBrandLogoContentType(contentType)) return "LOGO_UNSUPPORTED_TYPE";
  if (sizeBytes === 0) return "LOGO_EMPTY";
  if (sizeBytes > BRAND_LOGO_MAX_BYTES) return "LOGO_TOO_LARGE";
  return null;
}

/** Checks against what the image decoder actually found in the bytes. */
export function checkBrandLogoImage(
  contentType: BrandLogoContentType,
  image: { format: string; width: number; height: number } | null,
): BrandLogoRejection | null {
  if (!image || image.width <= 0 || image.height <= 0) return "LOGO_UNREADABLE";
  if (image.format !== FORMAT_BY_CONTENT_TYPE[contentType]) return "LOGO_TYPE_MISMATCH";
  const ratio = Math.max(image.width, image.height) / Math.min(image.width, image.height);
  if (ratio > BRAND_LOGO_MAX_ASPECT_RATIO) return "LOGO_NOT_SQUARE";
  return null;
}

// Uploaded SVG is only ever rendered to PNG on the server, never served, so
// script cannot reach users. This guard stops the renderer from loading
// anything outside the file and rejects markup a plain logo never needs.
const UNSAFE_SVG_PATTERNS: RegExp[] = [
  /<!DOCTYPE/i,
  /<!ENTITY/i,
  // Any namespace-prefixed element, e.g. <s:script> or <xi:include>.
  /<\s*\/?\s*[A-Za-z_][\w.-]*:[A-Za-z_]/,
  /<\s*script\b/i,
  /<\s*foreignObject\b/i,
  /<\s*(iframe|embed|object|image|animate\w*|set)\b/i,
  /\son[a-z]+\s*=/i,
  /javascript\s*:/i,
  // Only same-document references such as href="#gradient" or url(#clip).
  /href\s*=\s*(?!\s|["']?\s*#)/i,
  /url\(\s*(?!\s|["']?\s*#)/i,
  /@import/i,
  // CSS escapes can spell any of the above, e.g. @\69mport.
  /\\/,
];

export function checkBrandLogoSvgSafety(svgText: string): BrandLogoRejection | null {
  return UNSAFE_SVG_PATTERNS.some((pattern) => pattern.test(svgText))
    ? "LOGO_UNSAFE_SVG"
    : null;
}

export function storedBrandLogoType(contentType: BrandLogoContentType): StoredBrandLogoType {
  return contentType === "image/webp" ? "image/webp" : "image/png";
}

/**
 * Logos live in the `catalog-assets` bucket under a versioned, immutable key,
 * so a replaced logo gets a new URL and caches never go stale.
 */
export function brandLogoKey(slug: string, version: string, type: StoredBrandLogoType): string {
  return `brands/${slug}/${version}/logo.${type === "image/webp" ? "webp" : "png"}`;
}

/** Where an admin's upload waits until the API validates it. */
export function pendingBrandLogoKey(slug: string, uploadId: string): string {
  return `pending/brands/${slug}/${uploadId}`;
}

export function isPendingBrandLogoKey(slug: string, key: string): boolean {
  const prefix = `pending/brands/${slug}/`;
  return key.startsWith(prefix) && /^[0-9a-f-]{36}$/.test(key.slice(prefix.length));
}
