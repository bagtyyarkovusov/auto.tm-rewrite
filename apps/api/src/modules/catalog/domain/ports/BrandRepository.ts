import type { Brand } from "../Brand";

export interface BrandRepository {
  listBrands(opts: {
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: Brand[]; nextCursor?: { name: string; id: string } | undefined }>;

  getBrandById(id: string): Promise<Brand | null>;

  /** Unpaginated full list for the in-memory catalog search snapshot. */
  listAllBrands(): Promise<Brand[]>;

  getBySlug(slug: string): Promise<Brand | null>;

  create(data: {
    slug: string;
    nameRu: string;
    nameTk: string;
    nameEn: string;
  }): Promise<Brand>;

  update(
    id: string,
    data: {
      slug?: string | undefined;
      nameRu?: string | undefined;
      nameTk?: string | undefined;
      nameEn?: string | undefined;
    },
  ): Promise<Brand>;

  /**
   * Deletes the brand in one short database-only transaction and returns the
   * logo key of the row actually deleted (null for a brand without a logo), or
   * null when the brand no longer exists. A foreign-key failure throws and
   * returns no cleanup work.
   */
  delete(id: string): Promise<{ logoKey: string | null } | null>;
}

export const BRAND_REPOSITORY = Symbol("BrandRepository");
