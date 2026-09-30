export const LOGO_TIERS = ["A", "B", "C", "D", "E", "F"] as const;
export type LogoTier = (typeof LOGO_TIERS)[number];

export const LOGO_TRANSFORMS = ["alpha", "luminance"] as const;
export type LogoTransform = (typeof LOGO_TRANSFORMS)[number];

export const COMMONS_LICENCES = ["PD-textlogo", "PD-shape"] as const;
export type CommonsLicence = (typeof COMMONS_LICENCES)[number];

interface EntryBase {
  slug: string;
  tier: LogoTier;
}

interface SourcedEntryBase extends EntryBase {
  sourceUrl: string;
  licenceUrl: string;
  trademark: string;
  retrievedAt: string;
  sha256Master: string;
  transform: LogoTransform;
}

export interface SimpleIconsLogoEntry extends SourcedEntryBase {
  source: "simple-icons";
  simpleIconsSlug: string;
  simpleIconsVersion: string;
  upstreamSource: string | null;
  licence: "CC0-1.0";
}

export interface CommonsLogoEntry extends SourcedEntryBase {
  source: "commons";
  commonsFile: string;
  pageRevisionId: number;
  downloadUrl: string;
  licence: CommonsLicence;
}

export interface NoLogoEntry extends EntryBase {
  source: null;
  reason: string;
}

export type SourcedLogoEntry = SimpleIconsLogoEntry | CommonsLogoEntry;
export type ManifestEntry = SourcedLogoEntry | NoLogoEntry;

export interface BrandLogoManifest {
  schemaVersion: 1;
  entries: ManifestEntry[];
}

export class ManifestError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid brand logo manifest:\n- ${problems.join("\n- ")}`);
    this.name = "ManifestError";
  }
}

export const MANIFEST_PATH = new URL("../../prisma/seed/brand-logos.manifest.json", import.meta.url)
  .pathname;

export function parseBrandLogoManifest(_input: unknown): BrandLogoManifest {
  throw new Error("not implemented");
}

export function loadBrandLogoManifest(_path: string = MANIFEST_PATH): BrandLogoManifest {
  throw new Error("not implemented");
}

export function compareWithCatalog(
  _manifest: BrandLogoManifest,
  _catalogSlugs: readonly string[],
): { missing: string[]; unknown: string[] } {
  throw new Error("not implemented");
}
