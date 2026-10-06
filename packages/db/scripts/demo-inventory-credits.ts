#!/usr/bin/env tsx
/**
 * Writes the web credits page's data from the demo inventory photo manifest.
 *
 * The web app cannot import this package's scripts, so the credit fields are copied into
 * `apps/web/src/app/[locale]/demo-credits/credits.json`. A web test fails when the copy and the
 * manifest disagree; run `pnpm --filter @auto-tm/db demo-inventory:credits` after any manifest
 * change.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { DEMO_PHOTO_MANIFEST } from "./demo-inventory/manifest";

const target = path.join(__dirname, "../../../apps/web/src/app/[locale]/demo-credits/credits.json");

const photos = Object.values(DEMO_PHOTO_MANIFEST.listings).flatMap((listing) =>
  listing.photos.map(({ sourceFile, sourcePage, author, license, licenseUrl }) => ({
    sourceFile,
    sourcePage,
    author,
    license,
    licenseUrl,
  })),
);

writeFileSync(target, `${JSON.stringify({ verifiedOn: DEMO_PHOTO_MANIFEST.verifiedOn, photos }, null, 2)}\n`);
console.log(`Wrote ${photos.length} photo credits`);
