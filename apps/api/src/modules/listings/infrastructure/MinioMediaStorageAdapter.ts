import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { MediaStoragePort } from "../domain/ports/MediaStoragePort";
import type { Env } from "../../../env.schema";

@Injectable()
export class MinioMediaStorageAdapter implements MediaStoragePort {
  private readonly s3: S3Client;
  private readonly publicUrl: string;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
  ) {
    const minioEndpoint = this.config.get("MINIO_ENDPOINT", { infer: true });
    const accessKey = this.config.get("MINIO_ACCESS_KEY", { infer: true });
    const secretKey = this.config.get("MINIO_SECRET_KEY", { infer: true });
    const region = this.config.get("MINIO_REGION", { infer: true });

    this.publicUrl = this.config
      .get("MINIO_PUBLIC_URL", { infer: true })
      .replace(/\/$/, "");
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

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.ensurePublicReadBucket("listing-photos"),
      this.ensurePublicReadBucket("listing-videos"),
      this.ensurePublicReadBucket("chat-attachments"),
    ]);
  }

  async presignUpload(data: {
    key: string;
    contentType: string;
    sizeBytes: number;
    expirySeconds?: number;
  }): Promise<{ url: string; key: string }> {
    const bucket = this.inferBucket(data.key);

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
    return `${this.publicUrl}/${this.inferBucket(key)}/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    const bucket = this.inferBucket(key);

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  private inferBucket(key: string): string {
    if (key.startsWith("chat-attachments/")) {
      return "chat-attachments";
    }
    return key.includes(".mp4") || key.includes(".mov")
      ? "listing-videos"
      : "listing-photos";
  }

  private async ensurePublicReadBucket(bucket: string): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }

    await this.s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      }),
    );
  }
}
