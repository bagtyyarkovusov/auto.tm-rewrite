#!/usr/bin/env node
import { bootstrapBuckets, createMinioClientFromEnv, MEDIA_BUCKETS } from "./contract.mjs";

const client = createMinioClientFromEnv();

try {
  const results = await bootstrapBuckets(client, MEDIA_BUCKETS);
  for (const result of results) {
    const action = result.created ? "created" : "verified";
    console.log(`${action}: ${result.bucket}`);
  }
} finally {
  client.destroy?.();
}
