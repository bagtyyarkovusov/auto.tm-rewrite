import { createHash } from "node:crypto";

import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";

import type { PrismaClient } from "../../generated/prisma/client/client";

import { LOGO_TIERS, type BrandLogoManifest, type LogoTier, type SourcedLogoEntry } from "./manifest";
import { renderLogoMasks } from "./render";
import { verifyMasterSha, type MasterProvider } from "./sources";

/** Import keys carry this prefix in the version segment; admin uploads use `v<epoch-ms>`. */
export const IMPORT_VERSION_PREFIX = "imp-";

/** Bump when the rendering pipeline changes, so every import gets a new key and new URLs. */
export const RENDER_VERSION = 1;

/** Keys are versioned and never rewritten, so clients can cache them for good. */
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

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

/**
 * The objects written for one logo, all in one directory:
 * `logo.png` is what `Brand.logoKey` points at (the 90 px mask), and the
 * `mono@Nx.png` files are the 1x, 2x and 3x renditions of the 30 px icon.
 */
const FILES = [
  { file: "logo.png", size: 90 },
  { file: "mono@1x.png", size: 30 },
  { file: "mono@2x.png", size: 60 },
  { file: "mono@3x.png", size: 90 },
] as const;

export function importVersion(entry: SourcedLogoEntry): string {
  const digest = createHash("sha256")
    .update(`${entry.sha256Master}:${entry.transform}:${RENDER_VERSION}`)
    .digest("hex");
  return `${IMPORT_VERSION_PREFIX}${digest.slice(0, 12)}`;
}

function directoryOf(slug: string, version: string): string {
  return `brands/${slug}/${version}/`;
}

function isImportKey(slug: string, key: string): boolean {
  return new RegExp(`^brands/${slug}/${IMPORT_VERSION_PREFIX}[0-9a-f]{12}/logo\\.png$`).test(key);
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NotFound" || e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

class Importer {
  constructor(
    private readonly deps: ImportDeps,
    private readonly options: ImportOptions,
  ) {}

  async run(): Promise<ImportReport> {
    const { db, manifest } = this.deps;
    const brands = await db.brand.findMany({
      where: { slug: { in: manifest.entries.map((e) => e.slug) } },
      select: { id: true, slug: true, logoKey: true },
    });
    const bySlug = new Map(brands.map((b) => [b.slug, b]));

    const results: BrandImportResult[] = [];
    for (const entry of manifest.entries) {
      const brand = bySlug.get(entry.slug);
      if (entry.source === null) {
        results.push({
          slug: entry.slug,
          tier: entry.tier,
          outcome: "no-source",
          logoKeyAfter: brand?.logoKey ?? null,
          detail: entry.reason,
        });
      } else if (!brand) {
        results.push({ slug: entry.slug, tier: entry.tier, outcome: "not-in-catalog", logoKeyAfter: null });
      } else {
        results.push(await this.importOne(entry, brand));
      }
    }
    return { dryRun: this.options.dryRun, results, coverage: coverageOf(results) };
  }

  private async importOne(
    entry: SourcedLogoEntry,
    brand: { id: string; slug: string; logoKey: string | null },
  ): Promise<BrandImportResult> {
    const result = (outcome: ImportOutcome, logoKeyAfter: string | null, detail?: string) => ({
      slug: entry.slug,
      tier: entry.tier,
      outcome,
      logoKeyAfter,
      ...(detail === undefined ? {} : { detail }),
    });

    const current = brand.logoKey;
    const directory = directoryOf(brand.slug, importVersion(entry));
    const logoKey = `${directory}logo.png`;
    const adminOwned = current !== null && current !== logoKey && !isImportKey(brand.slug, current);
    if (adminOwned && !this.options.force) {
      return result("skipped-admin", current, "an admin uploaded this logo; use --force to replace it");
    }

    try {
      const master = await this.deps.masters.load(entry);
      verifyMasterSha(entry, master);
      const rendered = await renderLogoMasks(master, entry.transform);
      const files = FILES.map(({ file, size }) => ({
        key: `${directory}${file}`,
        png: (rendered.find((r) => r.size === size) as { png: Buffer }).png,
      }));

      if (current === logoKey) {
        const restored = await this.restoreMissing(files);
        return result("unchanged", current, restored > 0 ? `restored ${restored} missing object(s)` : undefined);
      }

      const outcome: ImportOutcome =
        current === null ? "imported" : adminOwned ? "replaced-admin" : "replaced-import";
      if (this.options.dryRun) return result(outcome, logoKey);

      await Promise.all(files.map((f) => this.put(f.key, f.png)));
      const swapped = await this.deps.db.brand.updateMany({
        where: { id: brand.id, logoKey: current },
        data: { logoKey },
      });
      if (swapped.count === 0) {
        // Deterministic keys may already belong to the winning import. Retain them.
        return result("failed", current, "the logo changed while importing; run the import again");
      }

      const note = current === null ? undefined : await this.deletePrevious(brand.slug, current);
      return result(outcome, logoKey, note);
    } catch (err) {
      return result("failed", current, messageOf(err));
    }
  }

  /** Puts back any object of an up-to-date logo that is missing from the bucket. */
  private async restoreMissing(files: { key: string; png: Buffer }[]): Promise<number> {
    let restored = 0;
    for (const file of files) {
      try {
        await this.deps.s3.send(new HeadObjectCommand({ Bucket: this.deps.bucket, Key: file.key }));
      } catch (err) {
        if (!isNotFound(err)) throw err;
        restored++;
        if (!this.options.dryRun) await this.put(file.key, file.png);
      }
    }
    return restored;
  }

  private async put(key: string, png: Buffer): Promise<void> {
    await this.deps.s3.send(
      new PutObjectCommand({
        Bucket: this.deps.bucket,
        Key: key,
        Body: png,
        ContentType: "image/png",
        CacheControl: IMMUTABLE_CACHE_CONTROL,
      }),
    );
  }

  /** Deletes the previous logo's objects once the database points elsewhere. */
  private async deletePrevious(slug: string, previousKey: string): Promise<string | undefined> {
    const directory = previousKey.slice(0, previousKey.lastIndexOf("/") + 1);
    try {
      // Only a plain `brands/<slug>/<version>/` directory is deleted as a whole.
      const keys = new RegExp(`^brands/${slug}/[^/]+/$`).test(directory)
        ? await this.listKeys(directory)
        : [previousKey];
      await this.deleteObjects(keys.length > 0 ? keys : [previousKey]);
      return undefined;
    } catch (err) {
      return `the previous logo's objects under ${directory} were not deleted: ${messageOf(err)}`;
    }
  }

  private async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const page = await this.deps.s3.send(
        new ListObjectsV2Command({ Bucket: this.deps.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      keys.push(...(page.Contents ?? []).map((o) => o.Key as string));
      token = page.NextContinuationToken;
    } while (token);
    return keys;
  }

  private async deleteObjects(keys: string[]): Promise<void> {
    const response = await this.deps.s3.send(
      new DeleteObjectsCommand({
        Bucket: this.deps.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if (response.Errors?.length) {
      throw new Error(response.Errors.map((error) =>
        `${error.Key ?? "unknown key"}: ${error.Code ?? "unknown error"}: ${error.Message ?? "no message"}`,
      ).join("; "));
    }
  }
}

function coverageOf(results: BrandImportResult[]): TierCoverage[] {
  return LOGO_TIERS.map((tier) => {
    const inTier = results.filter((r) => r.tier === tier);
    const withLogo = inTier.filter((r) => r.logoKeyAfter !== null).length;
    return { tier, total: inTier.length, withLogo, letterFallback: inTier.length - withLogo };
  });
}

export async function importBrandLogos(deps: ImportDeps, options: ImportOptions): Promise<ImportReport> {
  return new Importer(deps, options).run();
}

export function formatCoverageReport(report: ImportReport): string {
  const row = (label: string, total: number, withLogo: number, fallback: number) =>
    `  ${label.padEnd(6)}${String(total).padStart(7)}${String(withLogo).padStart(11)}${String(fallback).padStart(17)}`;
  const sum = (tiers: TierCoverage[], field: "total" | "withLogo" | "letterFallback") =>
    tiers.reduce((n, t) => n + t[field], 0);
  const abc = report.coverage.filter((c) => ["A", "B", "C"].includes(c.tier));

  const lines = [
    `Logo coverage by tier${report.dryRun ? " (dry run: what the import would leave)" : ""}`,
    "  Tier   Brands  With logo  Letter fallback",
    ...report.coverage.map((c) => row(c.tier, c.total, c.withLogo, c.letterFallback)),
    row("All", sum(report.coverage, "total"), sum(report.coverage, "withLogo"), sum(report.coverage, "letterFallback")),
    "",
    `Tiers A-C: ${sum(abc, "withLogo")} of ${sum(abc, "total")} brands have a logo (${sum(abc, "letterFallback")} letter fallback)`,
  ];
  return lines.join("\n");
}
