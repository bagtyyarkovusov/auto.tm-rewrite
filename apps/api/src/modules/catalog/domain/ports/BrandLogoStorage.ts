/** Object storage for catalog assets such as brand logos. */
export interface BrandLogoStorage {
  /** A presigned PUT for a direct upload; the uploader must send `headers`. */
  presignUpload(
    key: string,
    contentType: string,
    expirySeconds: number,
    sizeBytes: number,
  ): Promise<{ url: string; headers: Record<string, string> }>;
  /** The object's bytes and type, or null when it is missing or larger than `maxBytes`. */
  get(
    key: string,
    maxBytes: number,
  ): Promise<{ bytes: Uint8Array; contentType: string } | "too-large" | null>;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export const BRAND_LOGO_STORAGE = Symbol("BrandLogoStorage");
