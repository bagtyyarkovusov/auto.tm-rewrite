#!/usr/bin/env node
import { createMinioClientFromEnv, restoreBuckets } from "./contract.mjs";

const backupDir = process.argv[2];
if (!backupDir) {
  console.error("Usage: node infra/minio/restore.mjs <backup-dir>");
  process.exit(2);
}

const client = createMinioClientFromEnv();

try {
  const results = await restoreBuckets(client, backupDir);
  for (const result of results) {
    console.log(`restored: ${result.bucket} (${result.objects} objects)`);
  }
} finally {
  client.destroy?.();
}
