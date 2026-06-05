import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { MediaStoragePort } from "../domain/ports/MediaStoragePort";
import type { Env } from "../../../env.schema";

@Injectable()
export class MinioMediaStorageAdapter implements MediaStoragePort {
  private readonly s3: S3Client;
  private readonly endpoint: string;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
  ) {
    const minioEndpoint = this.config.get("MINIO_ENDPOINT", { infer: true });
    const accessKey = this.config.get("MINIO_ACCESS_KEY", { infer: true });
    const secretKey = this.config.get("MINIO_SECRET_KEY", { infer: true });
    const region = this.config.get("MINIO_REGION", { infer: true });

    this.endpoint = minioEndpoint;
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

  async presignUpload(data: {
    key: string;
    contentType: string;
    sizeBytes: number;
    expirySeconds?: number;
  }): Promise<{ url: string; key: string }> {
    const bucket = data.key.startsWith("pending/")
      ? data.key.includes(".mp4")
        ? "listing-videos"
        : "listing-photos"
      : "listing-photos";

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: data.key,
      ContentType: data.contentType,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: data.expirySeconds ?? 600,
    });

    return { url, key: data.key };
  }

  resolvePublicUrl(key: string): string {
    // Caddy serves at https://media.auto.tm/<bucket>/<key>
    // Bucket is encoded in the key prefix for pending uploads;
    // for attached media the key includes the full path.
    return `${this.endpoint}/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    const bucket = key.startsWith("pending/")
      ? key.includes(".mp4")
        ? "listing-videos"
        : "listing-photos"
      : "listing-photos";

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }
}
