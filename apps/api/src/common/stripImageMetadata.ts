import sharp from "sharp";

export class ImageTooLargeAfterCleaningError extends Error {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `Image is still ${sizeBytes} bytes after removing its metadata; the limit is ${maxBytes} bytes`,
    );
    this.name = "ImageTooLargeAfterCleaningError";
  }
}

/**
 * Re-encodes an image upright with no metadata (EXIF, GPS, XMP, IPTC), within
 * `maxBytes`. Quality steps down from the mobile app's own 80. Returns null
 * for an image that carries none, so a second pass neither re-encodes it nor
 * changes its size. Throws when the bytes are not a readable image, or hold
 * more than `maxPixels` pixels when that is given.
 */
export async function stripImageMetadata(
  input: Buffer,
  format: "jpeg" | "webp",
  maxBytes: number,
  maxPixels?: number,
): Promise<Buffer | null> {
  const open = () =>
    sharp(input, maxPixels === undefined ? {} : { limitInputPixels: maxPixels });
  const meta = await open().metadata();
  const carriesMetadata =
    meta.exif !== undefined ||
    meta.xmp !== undefined ||
    meta.iptc !== undefined ||
    (meta.orientation !== undefined && meta.orientation !== 1);
  if (!carriesMetadata) return null;

  let sizeBytes = 0;
  for (const quality of [80, 70, 60, 50]) {
    const upright = open().autoOrient();
    const encoded = await (format === "webp"
      ? upright.webp({ quality })
      : upright.jpeg({ quality, progressive: true })
    ).toBuffer();
    if (encoded.length <= maxBytes) return encoded;
    sizeBytes = encoded.length;
  }
  throw new ImageTooLargeAfterCleaningError(sizeBytes, maxBytes);
}
