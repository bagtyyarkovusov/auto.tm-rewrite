import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { DemoInventoryError } from "./result";

/** Where Listing photos live. The seed writes to no other bucket. */
const BUCKET = "listing-photos";
/** Where photos sent in a Conversation live. Only removal touches it, to delete them. */
export const CHAT_BUCKET = "chat-attachments";
export type DemoBucket = typeof BUCKET | typeof CHAT_BUCKET;
/** DeleteObjects accepts at most 1,000 keys. */
const DELETE_BATCH = 1000;

export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Every key under `prefix`, in the Listing photo bucket unless another is named. */
  list(prefix: string, bucket?: DemoBucket): Promise<string[]>;
  remove(keys: readonly string[], bucket?: DemoBucket): Promise<void>;
  close(): void;
}

export function createS3ObjectStore(options: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): ObjectStore {
  const s3 = new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    forcePathStyle: true,
    credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
  });
  return {
    async put(key, body, contentType) {
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
    },
    async list(prefix, bucket = BUCKET) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const page = await s3.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
        );
        for (const object of page.Contents ?? []) {
          if (object.Key) keys.push(object.Key);
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return keys;
    },
    async remove(keys, bucket = BUCKET) {
      for (let start = 0; start < keys.length; start += DELETE_BATCH) {
        const result = await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys.slice(start, start + DELETE_BATCH).map((Key) => ({ Key })), Quiet: true },
          }),
        );
        if (result.Errors?.length) {
          throw new DemoInventoryError(`Failed to delete ${result.Errors.length} stored objects`);
        }
      }
    },
    close() {
      s3.destroy();
    },
  };
}
