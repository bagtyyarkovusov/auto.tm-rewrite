export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  remove(keys: readonly string[]): Promise<void>;
  close(): void;
}

export function createS3ObjectStore(_options: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): ObjectStore {
  return {
    async put() {},
    async list() {
      return [];
    },
    async remove() {},
    close() {},
  };
}
