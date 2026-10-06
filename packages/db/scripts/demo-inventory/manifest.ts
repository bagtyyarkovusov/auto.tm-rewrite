import type { DemoCar } from "./content";

export type DemoPhoto = {
  readonly view: string;
  readonly sourceFile: string;
  readonly sourcePage: string;
  readonly url: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly author: string;
};

export type DemoPhotoManifest = {
  readonly schemaVersion: 1;
  readonly verifiedOn: string;
  readonly listings: Readonly<Record<string, { readonly subject: string; readonly photos: readonly DemoPhoto[] }>>;
};

export const DEMO_PHOTO_MANIFEST: DemoPhotoManifest = { schemaVersion: 1, verifiedOn: "", listings: {} };

export function validateDemoInventory(_cars: readonly DemoCar[], _manifest: DemoPhotoManifest): string[] {
  return [];
}
