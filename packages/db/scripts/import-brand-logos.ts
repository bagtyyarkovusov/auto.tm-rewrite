/**
 * One-off operator script: gives catalog brands a logo from the committed
 * provenance manifest (`prisma/seed/brand-logos.manifest.json`).
 *
 * Only Simple Icons icons (CC0-1.0, from the pinned npm package) and Wikimedia
 * Commons files tagged PD-textlogo or PD-shape are in the manifest. Commons
 * files are downloaded from upload.wikimedia.org on the machine running this
 * script into a gitignored cache and checked against the manifest's sha256.
 * The API and worker never fetch logos, and no logo bytes are committed.
 *
 * For each brand the script renders black-on-transparent PNG masks at 30, 60
 * and 90 px, uploads them to the `catalog-assets` bucket under a versioned key
 * (`brands/<slug>/imp-<hash>/`), and sets `Brand.logoKey`. It is idempotent:
 * a second run changes nothing. A logo an admin uploaded is skipped unless
 * `--force` is given.
 *
 *   pnpm --filter @auto-tm/db logos:import -- --dry-run
 *   pnpm --filter @auto-tm/db logos:import
 *   pnpm --filter @auto-tm/db logos:import -- --force
 *
 * Environment: DATABASE_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY,
 * and optionally MINIO_REGION (default us-east-1). Running it against staging or
 * production is an operator step.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../generated/prisma/client/client";

import { formatCoverageReport, importBrandLogos } from "./brand-logos/import";
import { loadBrandLogoManifest } from "./brand-logos/manifest";
import { createMasterProvider } from "./brand-logos/sources";

const BUCKET = "catalog-assets";
const CACHE_DIR = path.join(__dirname, "../node_modules/.cache/brand-logos");
const USAGE = "Usage: logos:import [--dry-run] [--force]";

function parseArgs(argv: string[]): { dryRun: boolean; force: boolean } {
  const flags = new Set(argv.filter((arg) => arg !== "--"));
  const known = ["--dry-run", "--force"];
  const unknown = [...flags].filter((flag) => !known.includes(flag));
  if (unknown.length > 0) {
    throw new Error(`Unknown option ${unknown.join(", ")}. ${USAGE}`);
  }
  return { dryRun: flags.has("--dry-run"), force: flags.has("--force") };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function hostOf(url: string): string {
  return new URL(url).host;
}

async function main(): Promise<void> {
  const envFile = path.join(__dirname, "../.env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const options = parseArgs(process.argv.slice(2));
  const databaseUrl = requireEnv("DATABASE_URL");
  const minioEndpoint = requireEnv("MINIO_ENDPOINT");

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  console.log(
    `Target: database ${hostOf(databaseUrl)}/${databaseName}, bucket ${BUCKET} on ${hostOf(minioEndpoint)}`,
  );
  console.log(
    `Mode: ${options.dryRun ? "dry run (nothing is written)" : "import"}${options.force ? ", --force (admin uploads are replaced)" : ""}`,
  );

  const manifest = loadBrandLogoManifest();
  const pool = new Pool({ connectionString: databaseUrl });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const s3 = new S3Client({
    endpoint: minioEndpoint,
    region: process.env["MINIO_REGION"] ?? "us-east-1",
    credentials: {
      accessKeyId: requireEnv("MINIO_ACCESS_KEY"),
      secretAccessKey: requireEnv("MINIO_SECRET_KEY"),
    },
    forcePathStyle: true,
  });

  try {
    const report = await importBrandLogos(
      { db, s3, bucket: BUCKET, manifest, masters: createMasterProvider({ cacheDir: CACHE_DIR }) },
      options,
    );

    for (const r of report.results.filter((x) => x.outcome !== "no-source")) {
      console.log(`${r.outcome.padEnd(16)}${r.slug}${r.detail ? `  (${r.detail})` : ""}`);
    }
    const counts = new Map<string, number>();
    for (const r of report.results) counts.set(r.outcome, (counts.get(r.outcome) ?? 0) + 1);
    console.log(`\n${[...counts].map(([outcome, n]) => `${outcome}: ${n}`).join(", ")}\n`);
    console.log(formatCoverageReport(report));

    if (report.results.some((r) => r.outcome === "failed")) process.exitCode = 1;
  } finally {
    await db.$disconnect();
    await pool.end();
    s3.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
