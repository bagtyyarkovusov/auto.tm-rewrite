/** Object storage for catalog assets such as brand logos. */
export interface BrandLogoStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export const BRAND_LOGO_STORAGE = Symbol("BrandLogoStorage");
