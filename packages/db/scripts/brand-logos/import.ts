import type { S3Client } from "@aws-sdk/client-s3";

import type { PrismaClient } from "../../generated/prisma/client/client";

import type { BrandLogoManifest, LogoTier } from "./manifest";
import type { MasterProvider } from "./sources";

/** Import keys carry this prefix in the version segment; admin uploads use `v<epoch-ms>`. */
export const IMPORT_VERSION_PREFIX = "imp-";

export interface ImportOptions {
  dryRun: boolean;
  force: boolean;
}

export interface ImportDeps {
  db: PrismaClient;
  s3: S3Client;
  bucket: string;
  manifest: BrandLogoManifest;
  masters: MasterProvider;
}

export type ImportOutcome =
  | "imported"
  | "replaced-import"
  | "replaced-admin"
  | "unchanged"
  | "skipped-admin"
  | "no-source"
  | "not-in-catalog"
  | "failed";

export interface BrandImportResult {
  slug: string;
  tier: LogoTier;
  outcome: ImportOutcome;
  /** Brand.logoKey after the run (what it would be, on a dry run). */
  logoKeyAfter: string | null;
  detail?: string;
}

export interface TierCoverage {
  tier: LogoTier;
  total: number;
  withLogo: number;
  letterFallback: number;
}

export interface ImportReport {
  dryRun: boolean;
  results: BrandImportResult[];
  coverage: TierCoverage[];
}

export async function importBrandLogos(
  _deps: ImportDeps,
  _options: ImportOptions,
): Promise<ImportReport> {
  throw new Error("not implemented");
}

export function formatCoverageReport(_report: ImportReport): string {
  throw new Error("not implemented");
}
