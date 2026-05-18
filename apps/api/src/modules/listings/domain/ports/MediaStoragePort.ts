export interface MediaStoragePort {
  presignUpload(data: {
    key: string;
    contentType: string;
    sizeBytes: number;
    expirySeconds?: number;
  }): Promise<{ url: string; key: string }>;

  resolvePublicUrl(key: string): string;
}

export const MEDIA_STORAGE_PORT = Symbol("MediaStoragePort");
