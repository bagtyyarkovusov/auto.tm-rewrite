#!/usr/bin/env node
import { backupBuckets, createMinioClientFromEnv, MEDIA_BUCKETS } from "./contract.mjs";

const outputDir = process.argv[2];
if (!outputDir) {
  console.error("Usage: node infra/minio/backup.mjs <output-dir>");
  process.exit(2);
}

const client = createMinioClientFromEnv();

try {
  const manifest = await backupBuckets(client, outputDir, MEDIA_BUCKETS);
  const objectCount = manifest.buckets.reduce(
    (total, bucket) => total + bucket.objects.length,
    0,
  );
  console.log(
    `backup written: ${outputDir} (${manifest.buckets.length} buckets, ${objectCount} objects)`,
  );
} finally {
  client.destroy?.();
}
