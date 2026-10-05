import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { Env } from "../../../env.schema";
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
});
