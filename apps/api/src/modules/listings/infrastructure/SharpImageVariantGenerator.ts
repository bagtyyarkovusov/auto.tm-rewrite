import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

import { UPLOAD_CAPS } from "../domain/MediaUpload";
import type { ImageVariantGenerator } from "../domain/ports/ImageVariantGenerator";
import type { Env } from "../../../env.schema";

interface VariantSpec {
  name: "thumbnail" | "list" | "detail" | "fullscreen";
  width: number;
  height: number;
  fit: "cover" | "contain";
}

const VARIANTS: VariantSpec[] = [
  { name: "thumbnail", width: 200, height: 200, fit: "cover" },
  { name: "list", width: 600, height: 400, fit: "cover" },
  { name: "detail", width: 1200, height: 800, fit: "contain" },
  { name: "fullscreen", width: 2400, height: 1600, fit: "contain" },
];

function requireVariantKey(
  keys: Partial<Record<VariantSpec["name"], string>>,
  name: VariantSpec["name"],
): string {
  const key = keys[name];
  if (!key) {
    throw new Error(`Missing generated image variant ${name}`);
  }
  return key;
}

@Injectable()
export class SharpImageVariantGenerator implements ImageVariantGenerator {
  private readonly s3: S3Client;
  private readonly logger = new Logger(SharpImageVariantGenerator.name);

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
  ) {
    const minioEndpoint = this.config.get("MINIO_ENDPOINT", { infer: true });
    const accessKey = this.config.get("MINIO_ACCESS_KEY", { infer: true });
    const secretKey = this.config.get("MINIO_SECRET_KEY", { infer: true });
    const region = this.config.get("MINIO_REGION", { infer: true });

    this.s3 = new S3Client({
      endpoint: minioEndpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
  }

  /**
   * Upright, without metadata, and within the upload cap: the adoption guard
   * re-checks the stored size on a retried publish, so the cleaned original
   * must still fit. Quality steps down from the mobile app's own 80.
   */
  private async cleanOriginal(input: Buffer, isWebp: boolean): Promise<Buffer> {
    const cap = UPLOAD_CAPS.image.maxSizeBytes;
    let encoded = input;
    for (const quality of [80, 70, 60, 50]) {
      const upright = sharp(input).autoOrient();
      encoded = await (isWebp
        ? upright.webp({ quality })
        : upright.jpeg({ quality, progressive: true })
      ).toBuffer();
      if (encoded.length <= cap) return encoded;
    }
    return encoded;
  }

  async generate(originalKey: string): Promise<{
    variants: {
      thumbnail: string;
      list: string;
      detail: string;
      fullscreen: string;
    };
  }> {
    const bucket = this.inferBucket(originalKey);
    const original = await this.s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: originalKey }),
    );

    if (!original.Body) {
      throw new Error(`Empty body for ${originalKey}`);
    }

    // The original stays readable at a key derived from every variant URL,
    // so one that carries metadata (EXIF, GPS, XMP, IPTC) or an orientation
    // tag is re-encoded upright with none and written back in place. A clean
    // original is left alone, so a retried publish neither re-encodes it
    // again nor changes its size.
    const isWebp = originalKey.endsWith(".webp");
    const input = Buffer.from(await original.Body.transformToByteArray());
    const meta = await sharp(input).metadata();
    const needsCleaning =
      meta.exif !== undefined ||
      meta.xmp !== undefined ||
      meta.iptc !== undefined ||
      (meta.orientation !== undefined && meta.orientation !== 1);
    const buffer = needsCleaning ? await this.cleanOriginal(input, isWebp) : input;
    if (needsCleaning) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: originalKey,
          Body: buffer,
          ContentType: isWebp ? "image/webp" : "image/jpeg",
        }),
      );
    }
    const base = originalKey.replace(/\/original\.(jpg|webp|jpeg)$/, "");

    const variantKeys: Partial<Record<VariantSpec["name"], string>> = {};

    for (const spec of VARIANTS) {
      const resized = await sharp(buffer)
        .resize(spec.width, spec.height, {
          fit: spec.fit,
          withoutEnlargement: true,
        })
        .toBuffer();

      // JPEG variant
      const jpegKey = `${base}/${spec.name}.jpg`;
      const jpegBuffer = await sharp(resized)
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: jpegKey,
          Body: jpegBuffer,
          ContentType: "image/jpeg",
        }),
      );

      // WebP variant
      const webpKey = `${base}/${spec.name}.webp`;
      const webpBuffer = await sharp(resized)
        .webp({ quality: 80 })
        .toBuffer();
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: webpKey,
          Body: webpBuffer,
          ContentType: "image/webp",
        }),
      );

      variantKeys[spec.name] = jpegKey;
    }

    return {
      variants: {
        thumbnail: requireVariantKey(variantKeys, "thumbnail"),
        list: requireVariantKey(variantKeys, "list"),
        detail: requireVariantKey(variantKeys, "detail"),
        fullscreen: requireVariantKey(variantKeys, "fullscreen"),
      },
    };
  }

  private inferBucket(key: string): string {
    return key.startsWith("pending/")
      ? key.includes(".mp4")
        ? "listing-videos"
        : "listing-photos"
      : "listing-photos";
  }
}
