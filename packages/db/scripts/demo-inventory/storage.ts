import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** Where Listing photos live. The seed and its removal touch no other bucket. */
const BUCKET = "listing-photos";
/** DeleteObjects accepts at most 1,000 keys. */
const DELETE_BATCH = 1000;

export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Every key under `prefix`. */
  list(prefix: string): Promise<string[]>;
  remove(keys: readonly string[]): Promise<void>;
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
    async list(prefix) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const page = await s3.send(
          new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }),
        );
        for (const object of page.Contents ?? []) {
          if (object.Key) keys.push(object.Key);
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return keys;
    },
    async remove(keys) {
      for (let start = 0; start < keys.length; start += DELETE_BATCH) {
        const result = await s3.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: keys.slice(start, start + DELETE_BATCH).map((Key) => ({ Key })), Quiet: true },
          }),
        );
        if (result.Errors?.length) {
          throw new Error(`Failed to delete ${result.Errors.length} stored objects`);
        }
      }
    },
    close() {
      s3.destroy();
    },
  };
}
