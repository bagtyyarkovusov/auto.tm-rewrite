import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { BrandLogoStorage } from "../domain/ports/BrandLogoStorage";
import type { Env } from "../../../env.schema";

/** Public-read bucket for catalog assets; bootstrapped by `pnpm minio:bootstrap`. */
export const CATALOG_ASSETS_BUCKET = "catalog-assets";

@Injectable()
export class MinioBrandLogoStorage implements BrandLogoStorage {
  private readonly s3: S3Client;
  private readonly signingS3: S3Client;
  private readonly publicBaseUrl: string;

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    this.publicBaseUrl = config.get("MINIO_PUBLIC_URL", { infer: true }).replace(/\/$/, "");
    const region = config.get("MINIO_REGION", { infer: true });
    const credentials = {
      accessKeyId: config.get("MINIO_ACCESS_KEY", { infer: true }),
      secretAccessKey: config.get("MINIO_SECRET_KEY", { infer: true }),
    };
    this.s3 = new S3Client({
      endpoint: config.get("MINIO_ENDPOINT", { infer: true }),
      region,
      credentials,
      forcePathStyle: true,
    });
    // Presigned URLs must name the public host the uploader can reach.
    this.signingS3 = new S3Client({
      endpoint: this.publicBaseUrl,
      region,
      credentials,
      forcePathStyle: true,
    });
  }

  async presignUpload(
    key: string,
    contentType: string,
    expirySeconds: number,
    sizeBytes: number,
  ): Promise<{ url: string; headers: Record<string, string> }> {
    const command = new PutObjectCommand({
      Bucket: CATALOG_ASSETS_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes,
      // Pending objects are private; attachment remains defense in depth.
      ContentDisposition: "attachment",
    });
    const url = await getSignedUrl(this.signingS3, command, {
      expiresIn: expirySeconds,
      unhoistableHeaders: new Set(["content-disposition"]),
    });
    return {
      url,
      headers: { "Content-Type": contentType, "Content-Disposition": "attachment" },
    };
  }

  async get(
    key: string,
    maxBytes: number,
  ): Promise<{ bytes: Uint8Array; contentType: string } | "too-large" | null> {
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({ Bucket: CATALOG_ASSETS_BUCKET, Key: key }),
      );
      if ((head.ContentLength ?? 0) > maxBytes) return "too-large";
      const object = await this.s3.send(
        new GetObjectCommand({ Bucket: CATALOG_ASSETS_BUCKET, Key: key }),
      );
      if (!object.Body) return null;
      const bytes = await object.Body.transformToByteArray();
      if (bytes.byteLength > maxBytes) return "too-large";
      return { bytes, contentType: object.ContentType ?? "" };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: CATALOG_ASSETS_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        // Keys are versioned, so an object never changes after it is written.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: CATALOG_ASSETS_BUCKET, Key: key }));
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/${CATALOG_ASSETS_BUCKET}/${key}`;
  }
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NotFound" || e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404;
}
