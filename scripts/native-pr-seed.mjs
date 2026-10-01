#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const NATIVE_PR_NAME = /^auto\.tm-rewrite-pr-[1-9]\d*$/;
const PROJECT_ID = '176ddec0-dd65-4087-b82c-798599fc2ebe';

/** Fail before constructing clients or launching any mutating child command. */
export function validateNativePrSeed(env, { remote = false } = {}) {
  if (!NATIVE_PR_NAME.test(env.RAILWAY_ENVIRONMENT_NAME ?? '')) {
    throw new Error('Native seed requires an auto.tm-rewrite-pr-<number> PR environment');
  }
  if (env.RAILWAY_PROJECT_ID !== PROJECT_ID || !env.RAILWAY_ENVIRONMENT_ID) {
    throw new Error('Native seed requires the AutoTM Railway project and explicit environment identity');
  }
  if (env.APP_ENV !== 'staging' || env.SMS_DRIVER !== 'mock') {
    throw new Error('Native seed requires nonproduction APP_ENV and SMS_DRIVER=mock');
  }
  for (const key of [remote ? 'DATABASE_URL' : 'DATABASE_PUBLIC_URL', 'MINIO_PUBLIC_URL', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY']) {
    if (!env[key]) throw new Error(`Native seed requires ${key}`);
  }
  const database = new URL(remote ? env.DATABASE_URL : env.DATABASE_PUBLIC_URL);
  const minio = new URL(env.MINIO_PUBLIC_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || minio.protocol !== 'https:') {
    throw new Error('Native seed requires public PostgreSQL and HTTPS MinIO connections');
  }
  const prNumber = env.RAILWAY_ENVIRONMENT_NAME.split('-').at(-1);
  if (minio.hostname !== `minio-autotm-rewrite-pr-${prNumber}.up.railway.app`) {
    throw new Error('Native seed requires the MinIO public endpoint of this PR');
  }
  if (remote) {
    if (database.hostname !== 'postgres.railway.internal' || new URL(env.MINIO_ENDPOINT).hostname !== 'minio.railway.internal') {
      throw new Error('Remote native seed requires private PR Postgres and MinIO services');
    }
    return { ...env, NATIVE_PR_SEED_REMOTE: 'true' };
  }
  return { ...env, DATABASE_URL: env.DATABASE_PUBLIC_URL, MINIO_ENDPOINT: env.MINIO_PUBLIC_URL, NATIVE_PR_SEED_REMOTE: 'false' };
}

export const nativePrSeedSteps = [
  { name: 'buckets', command: 'node', args: ['infra/minio/bootstrap.mjs'] },
  { name: 'catalog', command: 'pnpm', args: ['--filter', '@auto-tm/db', 'seed'] },
  { name: 'native fixtures', command: 'pnpm', args: ['--filter', '@auto-tm/db', 'ui:fixture', '--', '--railway-pr'] },
  { name: 'brand logos', command: 'pnpm', args: ['--filter', '@auto-tm/db', 'logos:import'] },
];

export function nativePrSeedStepsFor({ remote = false } = {}) {
  if (!remote) return nativePrSeedSteps;
  return [
    { name: 'buckets', command: process.execPath, args: ['packages/db/scripts/native-minio/bootstrap.mjs'] },
    { name: 'catalog', command: process.execPath, args: ['--import', 'tsx', 'packages/db/src/seed.ts'] },
    { name: 'native fixtures', command: process.execPath, args: ['--import', 'tsx', 'packages/db/scripts/ui-fixture.ts', '--railway-pr'] },
    { name: 'brand logos', command: process.execPath, args: ['--import', 'tsx', 'packages/db/scripts/import-brand-logos.ts'] },
  ];
}

export function runNativePrSeed(env = process.env, options = {}) {
  const guarded = validateNativePrSeed(env, options);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  for (const step of nativePrSeedStepsFor(options)) {
    console.log(`Native PR seed: ${step.name}`);
    const result = spawnSync(step.command, step.args, { cwd: root, env: guarded, stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error(`Native PR seed failed at ${step.name}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--remote')) throw new Error('Usage: native:seed [--remote]');
    runNativePrSeed(process.env, { remote: args.includes('--remote') });
  } catch (error) {
    // Never print a connection URL or provider error containing credentials.
    console.error(error instanceof Error ? error.message : 'Native PR seed refused');
    process.exitCode = 1;
  }
}
