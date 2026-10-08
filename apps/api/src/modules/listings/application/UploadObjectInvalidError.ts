import { BadRequestException } from "@nestjs/common";
import type { UploadObjectInvalidDetails } from "@auto-tm/contracts";

import type { MediaUpload } from "../domain/MediaUpload";
import { LISTING_ERROR_CODES } from "../domain/types";

/** The upload id stays in the application; HTTP details name only the client's photo. */
export class UploadObjectInvalidError extends BadRequestException {
  constructor(
    readonly upload: MediaUpload,
    readonly permanentlyInvalid: boolean,
    photoId?: string,
  ) {
    const details: UploadObjectInvalidDetails = { key: upload.key, ...(photoId ? { photoId } : {}) };
    super({
      code: LISTING_ERROR_CODES.UPLOAD_OBJECT_INVALID,
      message: "Uploaded file is missing or does not match the presigned upload",
      details,
    });
  }

  get uploadId(): string { return this.upload.id; }
  get key(): string { return this.upload.key; }
}
