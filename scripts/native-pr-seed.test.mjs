import assert from 'node:assert/strict';
import test from 'node:test';
import { validateNativePrSeed, nativePrSeedSteps } from './native-pr-seed.mjs';
const valid = { RAILWAY_ENVIRONMENT_NAME: 'auto.tm-rewrite-pr-481', RAILWAY_ENVIRONMENT_ID: 'pr-id', RAILWAY_PROJECT_ID: '176ddec0-dd65-4087-b82c-798599fc2ebe', SMS_DRIVER: 'mock', APP_ENV: 'staging', DATABASE_PUBLIC_URL: 'postgresql://demo:demo@example.com/demo', MINIO_PUBLIC_URL: 'https://minio-autotm-rewrite-pr-481.up.railway.app', MINIO_ACCESS_KEY: 'demo', MINIO_SECRET_KEY: 'demo' };
test('refuses production, staging, missing and misleading names before any seed operation', () => {
  for (const name of ['production', 'staging', undefined, 'production-pr-481', 'auto.tm-rewrite-pr-481-production', 'auto.tm-rewrite-pr-0']) {
    assert.throws(() => validateNativePrSeed({ ...valid, RAILWAY_ENVIRONMENT_NAME: name }), /PR environment/);
  }
});
test('requires mock SMS, nonproduction APP_ENV and Railway project identity', () => {
  for (const patch of [{ SMS_DRIVER: 'http' }, { APP_ENV: 'production' }, { RAILWAY_PROJECT_ID: 'other' }, { RAILWAY_ENVIRONMENT_ID: undefined }]) {
    assert.throws(() => validateNativePrSeed({ ...valid, ...patch }));
  }
});
test('uses explicit public connections without logging credentials', () => {
  const env = validateNativePrSeed({ ...valid, DATABASE_URL: 'private', MINIO_ENDPOINT: 'private' });
  assert.equal(env.DATABASE_URL, valid.DATABASE_PUBLIC_URL);
  assert.equal(env.MINIO_ENDPOINT, valid.MINIO_PUBLIC_URL);
});
test('one command orders storage and reference seed before fixtures and logos', () => {
  assert.deepEqual(nativePrSeedSteps.map(step => step.name), ['buckets', 'catalog', 'native fixtures', 'brand logos']);
});

test('rejects staging or another PR media origin even with a valid PR name', () => {
  for (const url of ['https://minio-staging-5795.up.railway.app', 'https://minio-autotm-rewrite-pr-480.up.railway.app']) {
    assert.throws(() => validateNativePrSeed({ ...valid, MINIO_PUBLIC_URL: url }), /this PR/);
  }
});

test('remote mode uses only this environment private service connections', () => {
  const remote = { ...valid, DATABASE_PUBLIC_URL: undefined, DATABASE_URL: 'postgresql://demo:demo@postgres.railway.internal/demo', MINIO_ENDPOINT: 'http://minio.railway.internal:9000' };
  const result = validateNativePrSeed(remote, { remote: true });
  assert.equal(result.DATABASE_URL, remote.DATABASE_URL);
  assert.equal(result.MINIO_ENDPOINT, remote.MINIO_ENDPOINT);
  assert.equal(result.NATIVE_PR_SEED_REMOTE, 'true');
  for (const patch of [{ DATABASE_URL: 'postgresql://demo:demo@example.com/demo' }, { MINIO_ENDPOINT: valid.MINIO_PUBLIC_URL }, { RAILWAY_ENVIRONMENT_NAME: 'production' }]) {
    assert.throws(() => validateNativePrSeed({ ...remote, ...patch }, { remote: true }));
  }
});
