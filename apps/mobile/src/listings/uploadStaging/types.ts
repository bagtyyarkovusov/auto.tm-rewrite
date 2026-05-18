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
  error?: string;
}

export interface UploadQueue {
  draftId: string;
  photos: StagedPhoto[];
}

export interface PublishGateResult {
  canPublish: boolean;
  blockers: string[];
}
