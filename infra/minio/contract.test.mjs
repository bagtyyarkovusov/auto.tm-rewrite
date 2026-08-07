import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  assertPublicReadOnlyPolicy,
  backupBuckets,
  bootstrapBuckets,
  publicReadPolicy,
  restoreBuckets,
} from "./contract.mjs";

class FakeS3Client {
  constructor() {
    this.buckets = new Map();
    this.policies = new Map();
    this.sent = [];
  }

  async send(command) {
    this.sent.push(command);
    const name = command.constructor.name;
    const input = command.input;

    if (name === "HeadBucketCommand") {
      if (!this.buckets.has(input.Bucket)) throw new Error("not found");
      return {};
    }
    if (name === "CreateBucketCommand") {
      this.buckets.set(input.Bucket, new Map());
      return {};
    }
    if (name === "PutBucketPolicyCommand") {
      this.policies.set(input.Bucket, input.Policy);
      return {};
    }
    if (name === "GetBucketPolicyCommand") {
      if (!this.policies.has(input.Bucket)) {
        const error = new Error("No policy");
        error.name = "NoSuchBucketPolicy";
        throw error;
      }
      return { Policy: this.policies.get(input.Bucket) };
    }
    if (name === "ListObjectsV2Command") {
      const objects = [...(this.buckets.get(input.Bucket)?.entries() ?? [])].map(
        ([Key, Body]) => ({ Key, Size: Body.length }),
      );
      return { Contents: objects };
    }
    if (name === "GetObjectCommand") {
      const body = this.buckets.get(input.Bucket)?.get(input.Key);
      if (!body) throw new Error("missing object");
      return { Body: Readable.from(body) };
    }
    if (name === "PutObjectCommand") {
      const chunks = [];
      for await (const chunk of input.Body) {
        chunks.push(Buffer.from(chunk));
      }
      this.buckets.get(input.Bucket).set(input.Key, Buffer.concat(chunks));
      return {};
    }
    throw new Error(`Unexpected command: ${name}`);
  }
}

test("public policy grants anonymous read without anonymous upload", () => {
  const policy = publicReadPolicy("listing-photos");

  assert.doesNotThrow(() => assertPublicReadOnlyPolicy(policy, "listing-photos"));
  assert.throws(
    () =>
      assertPublicReadOnlyPolicy(
        {
          ...policy,
          Statement: [
            ...policy.Statement,
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:PutObject"],
              Resource: ["arn:aws:s3:::listing-photos/*"],
            },
          ],
        },
        "listing-photos",
      ),
    /s3:GetObject only/,
  );
});

test("bucket bootstrap is idempotent and reapplies the public-read policy", async () => {
  const client = new FakeS3Client();

  assert.deepEqual(await bootstrapBuckets(client, ["listing-photos"]), [
    { bucket: "listing-photos", created: true },
  ]);
  assert.deepEqual(await bootstrapBuckets(client, ["listing-photos"]), [
    { bucket: "listing-photos", created: false },
  ]);
  assertPublicReadOnlyPolicy(client.policies.get("listing-photos"), "listing-photos");
});

test("backup writes object bytes, bucket policy, and checksums", async () => {
  const client = new FakeS3Client();
  await bootstrapBuckets(client, ["listing-photos"]);
  client.buckets.get("listing-photos").set("pending/a/original.jpg", Buffer.from("image"));
  const dir = await mkdtemp(join(tmpdir(), "autotm-minio-backup-test-"));

  const manifest = await backupBuckets(client, dir, ["listing-photos"]);

  assert.equal(manifest.buckets[0].objects[0].key, "pending/a/original.jpg");
  assert.match(manifest.buckets[0].objects[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(
    await readFile(join(dir, "objects/listing-photos/pending/a/original.jpg"), "utf8"),
    "image",
  );
  assertPublicReadOnlyPolicy(
    await readFile(join(dir, "policies/listing-photos.json"), "utf8"),
    "listing-photos",
  );
});

test("restore fails before writing when a backup object checksum does not match", async () => {
  const source = new FakeS3Client();
  await bootstrapBuckets(source, ["listing-photos"]);
  source.buckets.get("listing-photos").set("pending/a/original.jpg", Buffer.from("image"));
  const dir = await mkdtemp(join(tmpdir(), "autotm-minio-restore-test-"));
  await backupBuckets(source, dir, ["listing-photos"]);
  await writeFile(join(dir, "objects/listing-photos/pending/a/original.jpg"), "corrupt");

  const target = new FakeS3Client();
  await mkdir(join(dir, "unused"), { recursive: true });

  await assert.rejects(() => restoreBuckets(target, dir), /Checksum mismatch before restore/);
  assert.equal(target.buckets.get("listing-photos")?.size ?? 0, 0);
});
