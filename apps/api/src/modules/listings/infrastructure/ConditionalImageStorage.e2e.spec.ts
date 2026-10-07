import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Env } from "../../../env.schema";
import { MinioMediaStorageAdapter } from "./MinioMediaStorageAdapter";
import { SharpImageVariantGenerator } from "./SharpImageVariantGenerator";

// Uses only the disposable service started by hosted ci-services.sh, never a live bucket.
describe("conditional image protocol on digest-pinned hosted MinIO (#725)", () => {
  let s3: S3Client;
  let config: ConfigService<Env, true>;
  let adapter: MinioMediaStorageAdapter;
  const owned = new Set<string>();
  const bucket = "listing-photos";

  beforeAll(() => {
    const endpoint = process.env["MINIO_ENDPOINT"] ?? "";
    if (process.env["GITHUB_ACTIONS"] !== "true" ||
      !["localhost", "127.0.0.1"].includes(new URL(endpoint).hostname)) {
      throw new Error("This protocol gate requires hosted disposable MinIO; live/local provider tests are forbidden");
    }
    const values = {
      MINIO_ENDPOINT: endpoint, MINIO_PUBLIC_URL: endpoint,
      MINIO_ACCESS_KEY: process.env["MINIO_ACCESS_KEY"] ?? "minioadmin",
      MINIO_SECRET_KEY: process.env["MINIO_SECRET_KEY"] ?? "minioadmin",
      MINIO_REGION: "us-east-1",
    };
    config = new ConfigService(values) as ConfigService<Env, true>;
    adapter = new MinioMediaStorageAdapter(config);
    s3 = new S3Client({ endpoint, region: "us-east-1", forcePathStyle: true,
      credentials: { accessKeyId: values.MINIO_ACCESS_KEY, secretAccessKey: values.MINIO_SECRET_KEY } });
  });

  afterAll(async () => {
    if (!s3) return;
    for (const Key of owned) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
    s3.destroy();
  });

  function manifest(key: string): string[] {
    const base = key.slice(0, key.lastIndexOf("/") + 1);
    return [key, `${base}thumbnail.jpg`, `${base}thumbnail.webp`, `${base}list.jpg`, `${base}list.webp`,
      `${base}detail.jpg`, `${base}detail.webp`, `${base}fullscreen.jpg`, `${base}fullscreen.webp`];
  }

  async function issue() {
    const key = `pending/${randomUUID()}/original.jpg`;
    for (const member of manifest(key)) owned.add(member);
    const photo = await sharp({ create: { width: 32, height: 48, channels: 3, background: "red" } })
      .jpeg().withExif({ IFD0: { Make: "TestCam" }, IFD3: {
        GPSLatitudeRef: "N", GPSLatitude: "37/1 56/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "58/1 23/1 0/1",
      } }).toBuffer();
    const signed = await adapter.presignUpload({ key, contentType: "image/jpeg", sizeBytes: photo.length,
      ...{ writeProtocol: "conditional-v1" as const } });
    const headers = "headers" in signed ? signed.headers as Record<string, string> : {};
    return { key, photo, signed, headers };
  }

  async function upload(fixture: Awaited<ReturnType<typeof issue>>) {
    const response = await fetch(fixture.signed.url, { method: "PUT",
      headers: { "content-type": "image/jpeg", ...fixture.headers }, body: new Uint8Array(fixture.photo) });
    expect(response.status).toBe(200);
  }

  async function remove(keys: string[]) {
    for (const Key of keys) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
  }

  async function absent(keys: string[]) {
    for (const Key of keys) {
      await expect(s3.send(new HeadObjectCommand({ Bucket: bucket, Key }))).rejects.toMatchObject({
        $metadata: { httpStatusCode: 404 },
      });
    }
  }

  it("initializes all nine objects and enforces the actual signed header, replay and deleted-key refusal", async () => {
    const fixture = await issue();
    expect(fixture.headers["if-match"]).toBeTruthy();
    expect(new URL(fixture.signed.url).searchParams.get("X-Amz-SignedHeaders")?.split(";"))
      .toContain("if-match");
    for (const Key of manifest(fixture.key)) {
      expect((await s3.send(new HeadObjectCommand({ Bucket: bucket, Key }))).ContentLength).toBe(0);
    }
    for (const headers of [{ "content-type": "image/jpeg" },
      { "content-type": "image/jpeg", "if-match": '"altered"' }]) {
      const refused = await fetch(fixture.signed.url, { method: "PUT", headers, body: new Uint8Array(fixture.photo) });
      expect([400, 403, 409, 412]).toContain(refused.status);
    }
    await upload(fixture);
    const replay = await fetch(fixture.signed.url, { method: "PUT", headers: fixture.headers, body: new Uint8Array(fixture.photo) });
    expect([409, 412]).toContain(replay.status);
    await remove(manifest(fixture.key));
    const late = await fetch(fixture.signed.url, { method: "PUT", headers: fixture.headers, body: new Uint8Array(fixture.photo) });
    expect([404, 409, 412]).toContain(late.status);
    await absent(manifest(fixture.key));
  });

  it("scrubs original/variant metadata and fences every real generator write", async () => {
    const fixture = await issue();
    await upload(fixture);
    const generator = new SharpImageVariantGenerator(config);
    const writes: Array<string | undefined> = [];
    const transport = {
      send: async (command: unknown, options?: { abortSignal?: AbortSignal }) => {
        if (command instanceof PutObjectCommand && manifest(fixture.key).includes(command.input.Key!)) {
          writes.push(command.input.IfMatch);
        }
        return s3.send(command as PutObjectCommand, options);
      },
    };
    (generator as unknown as { s3: unknown }).s3 = transport;
    const generate = generator.generate.bind(generator) as (key: string, opts: { writeProtocol: "conditional-v1" }) => Promise<unknown>;
    await generate(fixture.key, { writeProtocol: "conditional-v1" });
    expect(writes).toHaveLength(9);
    expect(writes.every((match) => typeof match === "string" && match.length > 0)).toBe(true);
    for (const Key of manifest(fixture.key)) {
      const stored = await s3.send(new GetObjectCommand({ Bucket: bucket, Key }));
      expect((await sharp(Buffer.from(await stored.Body!.transformToByteArray())).metadata()).exif).toBeUndefined();
    }
  });

  it("cannot recreate any original/variant when a generator resumes its PUT after actual deletion", async () => {
    const fixture = await issue();
    await upload(fixture);
    let entered!: () => void;
    let resume!: () => void;
    const paused = new Promise<void>((resolve) => { entered = resolve; });
    const release = new Promise<void>((resolve) => { resume = resolve; });
    const generator = new SharpImageVariantGenerator(config);
    const transport = {
      send: async (command: unknown, options?: { abortSignal?: AbortSignal }) => {
        if (command instanceof PutObjectCommand && command.input.Key === manifest(fixture.key)[1]) {
          entered();
          await release;
        }
        return s3.send(command as PutObjectCommand, options);
      },
    };
    (generator as unknown as { s3: unknown }).s3 = transport;
    const generate = generator.generate.bind(generator) as (key: string, opts: { writeProtocol: "conditional-v1" }) => Promise<unknown>;
    const result = generate(fixture.key, { writeProtocol: "conditional-v1" }).then(() => null, (error: unknown) => error);
    await paused;
    try { await remove(manifest(fixture.key)); } finally { resume(); }
    expect(await result).toMatchObject({ $metadata: { httpStatusCode: 412 } });
    await absent(manifest(fixture.key));
  });
});
