import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { stripImageMetadata } from "../../../common/stripImageMetadata";
import type { Env } from "../../../env.schema";
import { CHAT_ATTACHMENT_MAX_SIZE_BYTES } from "../domain/ChatAttachment";
import type {
  ChatAttachmentCleaner,
  ChatAttachmentCleanResult,
} from "../domain/ports/ChatAttachmentCleaner";

const BUCKET = "chat-attachments";

function isNotFound(err: unknown): boolean {
  const failure = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    failure.name === "NotFound" ||
    failure.name === "NoSuchKey" ||
    failure.$metadata?.httpStatusCode === 404
  );
}

@Injectable()
export class SharpChatAttachmentCleaner implements ChatAttachmentCleaner {
  private readonly s3: S3Client;
  private readonly logger = new Logger(SharpChatAttachmentCleaner.name);

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
  ) {
    this.s3 = new S3Client({
      endpoint: this.config.get("MINIO_ENDPOINT", { infer: true }),
      region: this.config.get("MINIO_REGION", { infer: true }),
      credentials: {
        accessKeyId: this.config.get("MINIO_ACCESS_KEY", { infer: true }),
        secretAccessKey: this.config.get("MINIO_SECRET_KEY", { infer: true }),
      },
      forcePathStyle: true,
    });
  }

  async clean(key: string): Promise<ChatAttachmentCleanResult> {
    const input = await this.read(key);
    if (!input) return "missing";

    const isWebp = key.endsWith(".webp");
    let cleaned: Buffer | null;
    try {
      cleaned = await stripImageMetadata(
        input,
        isWebp ? "webp" : "jpeg",
        CHAT_ATTACHMENT_MAX_SIZE_BYTES,
      );
    } catch (err) {
      this.logger.warn(
        `Chat attachment ${key} is not a usable image: ${err instanceof Error ? err.message : String(err)}`,
      );
      return "invalid";
    }

    // The image stays readable at this key, so it is replaced in place.
    if (cleaned) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: cleaned,
          ContentType: isWebp ? "image/webp" : "image/jpeg",
        }),
      );
    }
    return "clean";
  }

  private async read(key: string): Promise<Buffer | null> {
    try {
      const object = await this.s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      );
      if (!object.Body) return null;
      return Buffer.from(await object.Body.transformToByteArray());
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }
}
