import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  ImageTooLargeAfterCleaningError,
  stripImageMetadata,
} from "./stripImageMetadata";

/** A noisy 400x300 photo with EXIF, so its encoded size follows the quality. */
async function noisyPhotoWithExif(): Promise<Buffer> {
  const width = 400;
  const height = 300;
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 7;
  for (let i = 0; i < pixels.length; i += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    pixels[i] = seed % 256;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .withExif({ IFD0: { Make: "TestCam" } })
    .toBuffer();
}

async function encodedSize(input: Buffer, quality: number): Promise<number> {
  const encoded = await sharp(input).autoOrient().jpeg({ quality, progressive: true }).toBuffer();
  return encoded.length;
}

describe("stripImageMetadata", () => {
  it("returns null for an image that carries no metadata", async () => {
    const clean = await sharp({
      create: { width: 40, height: 30, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer();

    await expect(stripImageMetadata(clean, "jpeg", 5_000_000)).resolves.toBeNull();
  });

  it("steps the quality down until the cleaned image fits the limit", async () => {
    const input = await noisyPhotoWithExif();
    const atQuality80 = await encodedSize(input, 80);
    const atQuality50 = await encodedSize(input, 50);
    expect(atQuality50).toBeLessThan(atQuality80);

    const cleaned = await stripImageMetadata(input, "jpeg", atQuality50);

    expect(cleaned).not.toBeNull();
    expect(cleaned!.length).toBe(atQuality50);
    expect((await sharp(cleaned!).metadata()).exif).toBeUndefined();
  });

  it("throws a clear error when the cleaned image exceeds the limit at every quality", async () => {
    const input = await noisyPhotoWithExif();
    const atQuality50 = await encodedSize(input, 50);

    await expect(stripImageMetadata(input, "jpeg", atQuality50 - 1)).rejects.toThrow(
      ImageTooLargeAfterCleaningError,
    );
  });

  it("throws for bytes that are not an image", async () => {
    await expect(stripImageMetadata(Buffer.from("not an image"), "jpeg", 5_000_000)).rejects.toThrow();
  });
});
