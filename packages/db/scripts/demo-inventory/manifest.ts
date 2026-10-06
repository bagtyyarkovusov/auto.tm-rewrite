/**
 * Photo sources for the demo inventory.
 *
 * `photos.manifest.json` lists every photograph a demo Listing shows: the Wikimedia Commons file,
 * its licence, its author and the download URL. The bytes are not committed. The seed downloads
 * them at run time and uploads them to the target's MinIO, which keeps a CC BY-SA corpus out of
 * the repository and out of every app binary.
 *
 * Each photo was opened and checked before it was listed: it shows the model, colour and body type
 * its Listing claims, and every photo of one Listing shows the same car. `view` records what the
 * photo shows. Do not repoint a URL without opening the image again and updating the Listing in
 * `content.ts` that uses it. The web credits page is generated from the same file
 * (`apps/web/src/app/[locale]/demo-credits/credits.json`), so a manifest change needs
 * `pnpm --filter @auto-tm/db demo-inventory:credits`.
 */
import type { DemoCar } from "./content";
import manifestJson from "./photos.manifest.json" with { type: "json" };

export type DemoPhoto = {
  /** What the photo shows, for example `front-left` or `interior-dashboard`. */
  readonly view: string;
  /** Commons file name, without the `File:` prefix. */
  readonly sourceFile: string;
  readonly sourcePage: string;
  readonly url: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly author: string;
};

export type DemoPhotoManifest = {
  readonly schemaVersion: 1;
  /** The day every photo was last opened and checked against its Listing. */
  readonly verifiedOn: string;
  /** Keyed by `DemoCar.slug`. Photos are in gallery order; the first is the cover. */
  readonly listings: Readonly<Record<string, { readonly subject: string; readonly photos: readonly DemoPhoto[] }>>;
};

export const MIN_PHOTOS = 5;
export const MAX_PHOTOS = 8;

/** Licences the issue allows, in its order of preference. */
const ALLOWED_LICENCE = /^(CC0|Public domain|CC BY \d\.\d|CC BY-SA \d\.\d)$/;
const COMMONS_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org"]);

export const DEMO_PHOTO_MANIFEST = manifestJson as DemoPhotoManifest;

function isCommonsUpload(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && COMMONS_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Every problem that would let a Listing publish with the wrong number of photos or a photo
 * without its credit. An empty result is the licensing and completeness gate.
 */
export function validateDemoInventory(cars: readonly DemoCar[], manifest: DemoPhotoManifest): string[] {
  const problems: string[] = [];
  const usedBy = new Map<string, string>();
  const slugs = new Set(cars.map((car) => car.slug));

  for (const car of cars) {
    const entry = manifest.listings[car.slug];
    if (!entry) {
      problems.push(`${car.slug}: no manifest entry`);
      continue;
    }
    if (entry.photos.length < MIN_PHOTOS || entry.photos.length > MAX_PHOTOS) {
      problems.push(`${car.slug}: ${entry.photos.length} photos, expected ${MIN_PHOTOS} to ${MAX_PHOTOS}`);
    }
    for (const [index, photo] of entry.photos.entries()) {
      const at = `${car.slug} photo ${index + 1}`;
      if (!photo.license.trim()) problems.push(`${at}: licence is missing`);
      else if (!ALLOWED_LICENCE.test(photo.license)) {
        problems.push(`${at}: licence ${photo.license} is not CC0, public domain, CC BY or CC BY-SA`);
      }
      if (!photo.author.trim()) problems.push(`${at}: author is missing`);
      if (!photo.sourceFile.trim()) problems.push(`${at}: source file is missing`);
      else {
        const owner = usedBy.get(photo.sourceFile);
        if (owner) problems.push(`${at}: ${photo.sourceFile} is already used by ${owner}`);
        else usedBy.set(photo.sourceFile, car.slug);
      }
      if (!isCommonsUpload(photo.url)) problems.push(`${at}: url is not a Wikimedia Commons upload`);
    }
  }
  for (const slug of Object.keys(manifest.listings)) {
    if (!slugs.has(slug)) problems.push(`${slug}: manifest entry has no Listing`);
  }
  return problems;
}
