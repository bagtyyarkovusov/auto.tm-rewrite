import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { Env } from "../../../env.schema";
import { SharpChatAttachmentCleaner } from "./SharpChatAttachmentCleaner";

const KEY =
  "chat-attachments/7d0c1a52-3b64-4e8f-9a17-5c2e8f1b6d90/0b9f3c1e-2d4a-4c6b-8e1f-3a5b7c9d1e2f/original.jpg";

/** An in-memory stand-in for the bucket the cleaner reads and writes. */
function fakeBucket(initial: Record<string, Buffer>) {
  const objects = new Map(Object.entries(initial));
  const puts: PutObjectCommand[] = [];
  const reads: string[] = [];
  const send = async (command: unknown) => {
    if (command instanceof GetObjectCommand) {
      expect(command.input.Bucket).toBe("chat-attachments");
      const body = objects.get(command.input.Key!);
      if (!body) throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
      return {
        ContentLength: body.length,
        Body: {
          transformToByteArray: async () => {
            reads.push(command.input.Key!);
            return new Uint8Array(body);
          },
        },
      };
    }
    if (command instanceof PutObjectCommand) {
      puts.push(command);
      objects.set(command.input.Key!, Buffer.from(command.input.Body as Buffer));
      return {};
    }
    throw new Error("unexpected command");
  };
  return { objects, puts, reads, send };
}

function cleanerWith(bucket: ReturnType<typeof fakeBucket>) {
  const config = { get: () => "http://minio.test" } as unknown as ConfigService<Env, true>;
  const cleaner = new SharpChatAttachmentCleaner(config);
  (cleaner as unknown as { s3: { send: typeof bucket.send } }).s3 = { send: bucket.send };
  return cleaner;
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

describe("SharpChatAttachmentCleaner", () => {
  it("rewrites a photo carrying GPS upright and without EXIF, under the same key", async () => {
    const input = await photoWithGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const bucket = fakeBucket({ [KEY]: input });

    await expect(cleanerWith(bucket).clean(KEY)).resolves.toBe("clean");

    const stored = await sharp(bucket.objects.get(KEY)!).metadata();
    expect(stored.exif).toBeUndefined();
    expect(stored.orientation).toBeUndefined();
    // Orientation 6 is a 90 degree turn: the upright image is portrait.
    expect({ width: stored.width, height: stored.height }).toEqual({ width: 200, height: 300 });
    expect(bucket.puts[0]?.input.ContentType).toBe("image/jpeg");
  });

  it("strips a WebP image and keeps it WebP", async () => {
    const key = KEY.replace("original.jpg", "original.webp");
    const input = await sharp(await photoWithGps()).keepMetadata().webp().toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const bucket = fakeBucket({ [key]: input });

    await expect(cleanerWith(bucket).clean(key)).resolves.toBe("clean");

    const stored = await sharp(bucket.objects.get(key)!).metadata();
    expect(stored.format).toBe("webp");
    expect(stored.exif).toBeUndefined();
    expect(bucket.puts[0]?.input.ContentType).toBe("image/webp");
  });

  it("leaves an image without metadata untouched", async () => {
    const input = await sharp({
      create: { width: 300, height: 200, channels: 3, background: { r: 10, g: 120, b: 200 } },
    })
      .jpeg({ quality: 80 })
      .toBuffer();
    const bucket = fakeBucket({ [KEY]: input });

    await expect(cleanerWith(bucket).clean(KEY)).resolves.toBe("clean");

    expect(bucket.puts).toHaveLength(0);
    expect(Buffer.compare(bucket.objects.get(KEY)!, input)).toBe(0);
  });

  it("reports a key with no stored object as missing", async () => {
    const bucket = fakeBucket({});

    await expect(cleanerWith(bucket).clean(KEY)).resolves.toBe("missing");
  });

  it("reports a stored object that is not an image as invalid and does not rewrite it", async () => {
    const bucket = fakeBucket({ [KEY]: Buffer.from("not an image") });

    await expect(cleanerWith(bucket).clean(KEY)).resolves.toBe("invalid");
    expect(bucket.puts).toHaveLength(0);
  });

  it("reports a PNG stored under a .jpg key as invalid and does not rewrite it", async () => {
    const png = await sharp({
      create: { width: 30, height: 20, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();
    const bucket = fakeBucket({ [KEY]: png });

    await expect(cleanerWith(bucket).clean(KEY)).resolves.toBe("invalid");
    expect(bucket.puts).toHaveLength(0);
  });

  it("reports a stored object over the 5 MB cap as invalid without reading it", async () => {
    const bucket = fakeBucket({ [KEY]: Buffer.alloc(5 * 1024 * 1024 + 1) });

    await expect(cleanerWith(bucket).clean(KEY)).resolves.toBe("invalid");
    expect(bucket.reads).toEqual([]);
    expect(bucket.puts).toHaveLength(0);
  });
});
