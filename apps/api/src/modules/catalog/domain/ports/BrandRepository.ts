import type { Brand } from "../Brand";

export interface BrandRepository {
  listBrands(opts: {
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: Brand[]; nextCursor?: { name: string; id: string } | undefined }>;

  getBrandById(id: string): Promise<Brand | null>;
}

export const BRAND_REPOSITORY = Symbol("BrandRepository");
