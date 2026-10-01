/**
 * Loads `.env`, then decides where the UI fixture may write.
 *
 * `ui-fixture.ts` imports this before any other module, so an unsafe target is refused before the
 * generated Prisma client, sharp or an S3 client is loaded, and nothing can connect before the guard
 * has run. The decision itself lives in `native-pr-seed-guard.cjs`, shared with `native:seed`.
 */
import "dotenv/config";

import { assertFixtureTarget } from "./native-pr-seed-guard.cjs";

const target = assertFixtureTarget(process.env, process.argv);

export const DATABASE_URL = target.databaseUrl;
export const MINIO_ENDPOINT = target.minioEndpoint;
