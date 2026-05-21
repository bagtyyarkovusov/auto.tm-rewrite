export type PhotoState =
  | "selected"
  | "compressed"
  | "presigned"
  | "uploading"
  | "uploaded"
  | "attached"
  | "failed"
  | "waiting_for_network"
  | "lost";

export type UploadErrorCode =
  | "PRESIGN_FAILED"
  | "PUT_FAILED"
  | "LOCAL_FILE_MISSING"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "COMPRESSION_FAILED"
  | "UNKNOWN";

export interface UploadError {
  code: UploadErrorCode;
  message: string;
  retryable: boolean;
}

export interface StagedPhoto {
  photoId: string;
  localUri?: string;
  key?: string;
  uploadUrl?: string;
  state: PhotoState;
  width?: number;
  height?: number;
  fileSize?: number;
  sortOrder: number;
  retryCount: number;
  error?: UploadError;
}

export interface UploadQueue {
  stagingKey: string;
  photos: StagedPhoto[];
}

export interface PublishGateResult {
  canPublish: boolean;
  blockers: string[];
}
