'use strict';

/**
 * The single guard for demo-data seeding of a Railway PR environment (ADR-0075).
 *
 * Two entry points enforce it: `scripts/native-pr-seed.mjs` before it starts any step, and
 * `scripts/ui-fixture.ts` before it loads a client. It is CommonJS so both the plain-Node entry
 * point and the tsx-run fixture can load it on every supported Node version.
 *
 * Pure: it reads only the values it is given and does no I/O. No error message contains a
 * connection string, credential or other variable value, and a malformed URL is reported by
 * variable name only, because a refused input may still be a real secret.
 */

const NATIVE_PR_NAME = /^auto\.tm-rewrite-pr-[1-9]\d*$/;
const NATIVE_PR_PROJECT_ID = '176ddec0-dd65-4087-b82c-798599fc2ebe';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const DEFAULT_LOCAL_MINIO_ENDPOINT = 'http://localhost:9000';

function refuse(message) {
  throw new Error(message);
}

/** Parse a URL variable, naming it, never echoing its value, in the failure. */
function parseUrl(key, value, subject) {
  try {
    return new URL(value);
  } catch {
    return refuse(`${subject} requires ${key} to be a valid URL`);
  }
}

/**
 * Refuse unless this is the AutoTM PR environment itself: its name, project and environment
 * identity, mock SMS, a private Postgres and MinIO, and its own public media host.
 * Production, staging, another PR and every unparseable value are refused.
 */
function assertNativePrSeedEnvironment(env) {
  if (!NATIVE_PR_NAME.test(env.RAILWAY_ENVIRONMENT_NAME ?? '')) {
    refuse('Native seed requires an auto.tm-rewrite-pr-<number> PR environment');
  }
  if (env.RAILWAY_PROJECT_ID !== NATIVE_PR_PROJECT_ID || !env.RAILWAY_ENVIRONMENT_ID) {
    refuse('Native seed requires the AutoTM Railway project and explicit environment identity');
  }
  if (env.APP_ENV !== 'staging' || env.SMS_DRIVER !== 'mock') {
    refuse('Native seed requires nonproduction APP_ENV and SMS_DRIVER=mock');
  }
  for (const key of ['DATABASE_URL', 'MINIO_ENDPOINT', 'MINIO_PUBLIC_URL', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY']) {
    if (!env[key]) refuse(`Native seed requires ${key}`);
  }
  const database = parseUrl('DATABASE_URL', env.DATABASE_URL, 'Native seed');
  const minioEndpoint = parseUrl('MINIO_ENDPOINT', env.MINIO_ENDPOINT, 'Native seed');
  const minioPublic = parseUrl('MINIO_PUBLIC_URL', env.MINIO_PUBLIC_URL, 'Native seed');
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    refuse('Native seed requires DATABASE_URL to be a PostgreSQL URL');
  }
  if (minioPublic.protocol !== 'https:') {
    refuse('Native seed requires MINIO_PUBLIC_URL to be an HTTPS URL');
  }
  const prNumber = env.RAILWAY_ENVIRONMENT_NAME.split('-').at(-1);
  if (minioPublic.hostname !== `minio-autotm-rewrite-pr-${prNumber}.up.railway.app`) {
    refuse('Native seed requires the MinIO public endpoint of this PR');
  }
  if (database.hostname !== 'postgres.railway.internal' || minioEndpoint.hostname !== 'minio.railway.internal') {
    refuse('Native seed requires private PR Postgres and MinIO services');
  }
}

function assertLocalUrl(key, value) {
  const { hostname } = parseUrl(key, value, 'ui-fixture');
  if (!LOCAL_HOSTS.includes(hostname)) {
    // Name the variable only: a malformed URL can parse with a credential fragment as its host.
    refuse(`ui-fixture refuses to run against a non-local ${key}`);
  }
}

/**
 * Decide where the UI fixture may write and return that target. With `--railway-pr` the target
 * must pass the PR guard above; otherwise both connections must be on localhost, which is the
 * ordinary developer path.
 */
function assertFixtureTarget(env, argv) {
  if (argv.includes('--railway-pr')) {
    assertNativePrSeedEnvironment(env);
    return { databaseUrl: env.DATABASE_URL, minioEndpoint: env.MINIO_ENDPOINT };
  }
  const databaseUrl = env.DATABASE_URL ?? '';
  const minioEndpoint = env.MINIO_ENDPOINT ?? DEFAULT_LOCAL_MINIO_ENDPOINT;
  assertLocalUrl('DATABASE_URL', databaseUrl);
  assertLocalUrl('MINIO_ENDPOINT', minioEndpoint);
  return { databaseUrl, minioEndpoint };
}

module.exports = {
  NATIVE_PR_NAME,
  NATIVE_PR_PROJECT_ID,
  assertNativePrSeedEnvironment,
  assertFixtureTarget,
};
