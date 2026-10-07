import { randomBytes } from "node:crypto";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { Env } from "../../../env.schema";
import { DomainError, LISTING_ERROR_CODES } from "../domain/types";
import { SharpImageVariantGenerator } from "./SharpImageVariantGenerator";

/** An in-memory stand-in for the bucket the generator reads and writes. */
function fakeBucket(initial: Record<string, Buffer>) {
  const objects = new Map(Object.entries(initial));
  const send = async (command: unknown) => {
    if (command instanceof GetObjectCommand) {
      const body = objects.get(command.input.Key!);
      if (!body) throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
      return { Body: { transformToByteArray: async () => new Uint8Array(body) } };
    }
    if (command instanceof PutObjectCommand) {
      objects.set(command.input.Key!, Buffer.from(command.input.Body as Buffer));
      return {};
    }
    throw new Error("unexpected command");
  };
  return { objects, send };
}

function generatorWith(bucket: ReturnType<typeof fakeBucket>) {
  const config = { get: () => "http://minio.test" } as unknown as ConfigService<Env, true>;
  const generator = new SharpImageVariantGenerator(config);
  (generator as unknown as { s3: { send: typeof bucket.send } }).s3 = { send: bucket.send };
  return generator;
}

/** A 300x200 camera photo with a GPS position, stored rotated (EXIF Orientation 6). */
async function photoWithGps(): Promise<Buffer> {
  return sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 200, g: 30, b: 30 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: "TestCam" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "37/1 56/1 0/1",
        GPSLongitudeRef: "E",
        GPSLongitude: "58/1 23/1 0/1",
      },
    })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe("SharpImageVariantGenerator", () => {
  it("strips GPS and all EXIF from the stored original and every variant, keeping the photo upright", async () => {
    const key = "pending/0b9f3c1e-2d4a-4c6b-8e1f-3a5b7c9d1e2f/original.jpg";
    const input = await photoWithGps();
    const inputMeta = await sharp(input).metadata();
    expect(inputMeta.exif).toBeDefined();
    expect(inputMeta.orientation).toBe(6);

    const bucket = fakeBucket({ [key]: input });
    await generatorWith(bucket).generate(key);

    const base = key.replace("/original.jpg", "");
    const served = [
      key,
      ...["thumbnail", "list", "detail", "fullscreen"].flatMap((v) => [
        `${base}/${v}.jpg`,
        `${base}/${v}.webp`,
      ]),
    ];
    for (const servedKey of served) {
      const stored = bucket.objects.get(servedKey);
      expect(stored, servedKey).toBeDefined();
      const meta = await sharp(stored!).metadata();
      expect(meta.exif, `${servedKey} carries EXIF`).toBeUndefined();
      expect(meta.orientation, `${servedKey} carries an Orientation tag`).toBeUndefined();
    }

    // Orientation 6 is a 90 degree turn: the upright original is portrait.
    const original = await sharp(bucket.objects.get(key)!).metadata();
    expect({ width: original.width, height: original.height }).toEqual({ width: 200, height: 300 });
  });
  it("leaves an original without metadata untouched, so a retried publish keeps its size", async () => {
    const key = "pending/1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f/original.jpg";
    const input = await sharp({
      create: { width: 300, height: 200, channels: 3, background: { r: 10, g: 120, b: 200 } },
    })
      .jpeg({ quality: 80 })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeUndefined();

    const bucket = fakeBucket({ [key]: input });
    await generatorWith(bucket).generate(key);

    expect(Buffer.compare(bucket.objects.get(key)!, input)).toBe(0);
  });

  // #735 / ADR-0089: bytes that can never become an image are a permanent
  // failure (UPLOAD_OBJECT_INVALID), so publish names the photo and retires
  // only that upload; transport failures stay transient and retryable.
  it("reports bytes that are not an image as UPLOAD_OBJECT_INVALID", async () => {
    const key = "pending/2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d/original.jpg";
    const bucket = fakeBucket({ [key]: Buffer.from("this is not an image at all") });

    const err = await generatorWith(bucket).generate(key).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe(LISTING_ERROR_CODES.UPLOAD_OBJECT_INVALID);
  });

  it("reports an image still over the upload cap after cleaning as UPLOAD_OBJECT_INVALID", async () => {
    const key = "pending/3b4c5d6e-7f8a-9b0c-1d2e-3f4a5b6c7d8e/original.jpg";
    // Random pixels compress badly, so even the lowest cleaning quality stays
    // over the 5 MB cap; the EXIF tag forces the cleaning pass.
    const noise = await sharp(
      Buffer.from(randomBytes(3600 * 2400 * 3)),
      { raw: { width: 3600, height: 2400, channels: 3 } },
    )
      .jpeg({ quality: 100 })
      .withExif({ IFD0: { Make: "NoiseCam" } })
      .toBuffer();
    const bucket = fakeBucket({ [key]: noise });

    const err = await generatorWith(bucket).generate(key).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe(LISTING_ERROR_CODES.UPLOAD_OBJECT_INVALID);
  }, 20000);

  it("keeps a missing stored object a transient error, not UPLOAD_OBJECT_INVALID", async () => {
    const key = "pending/4c5d6e7f-8a9b-0c1d-2e3f-4a5b6c7d8e9f/original.jpg";
    const bucket = fakeBucket({});

    const err = await generatorWith(bucket).generate(key).catch((e: unknown) => e);

    expect(err).not.toBeInstanceOf(DomainError);
    expect((err as Error).name).toBe("NoSuchKey");
  });
});
