import type { Brand } from "../Brand";

/**
 * The outcome of an atomic logo swap. `replaced: false` is a positive report
 * that nothing was written; an exception means the outcome is unknown, because
 * the database may already have committed.
 */
export type LogoKeyReplacement =
  | { replaced: true; previousKey: string | null }
  | { replaced: false; reason: "not-found" };

/** Reads and writes the logo key of a Brand. */
export interface BrandLogoRepository {
  getBrandById(id: string): Promise<Brand | null>;
  /**
   * Atomically sets or clears the logo key and returns the key it actually
   * replaced, which can differ from an earlier read. A short database-only
   * operation: callers touch storage before or after it, never inside it.
   */
  replaceLogoKey(id: string, logoKey: string | null): Promise<LogoKeyReplacement>;
}

export const BRAND_LOGO_REPOSITORY = Symbol("BrandLogoRepository");
