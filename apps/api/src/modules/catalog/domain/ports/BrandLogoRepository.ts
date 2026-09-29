import type { Brand } from "../Brand";

/** Reads and writes the logo key of a Brand. */
export interface BrandLogoRepository {
  getBrandById(id: string): Promise<Brand | null>;
  setLogoKey(id: string, logoKey: string | null): Promise<Brand>;
}

export const BRAND_LOGO_REPOSITORY = Symbol("BrandLogoRepository");
