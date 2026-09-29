import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { BrandLogoStorage } from "../domain/ports/BrandLogoStorage";
import type { Env } from "../../../env.schema";

/** Public-read bucket for catalog assets; bootstrapped by `pnpm minio:bootstrap`. */
export const CATALOG_ASSETS_BUCKET = "catalog-assets";

@Injectable()
export class MinioBrandLogoStorage implements BrandLogoStorage {
  private readonly s3: S3Client;
  private readonly publicBaseUrl: string;

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    this.publicBaseUrl = config.get("MINIO_PUBLIC_URL", { infer: true }).replace(/\/$/, "");
    this.s3 = new S3Client({
      endpoint: config.get("MINIO_ENDPOINT", { infer: true }),
      region: config.get("MINIO_REGION", { infer: true }),
      credentials: {
        accessKeyId: config.get("MINIO_ACCESS_KEY", { infer: true }),
        secretAccessKey: config.get("MINIO_SECRET_KEY", { infer: true }),
      },
      forcePathStyle: true,
    });
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
