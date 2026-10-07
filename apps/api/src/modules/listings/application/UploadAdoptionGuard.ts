import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import { storedObjectMatches, type MediaUpload } from "../domain/MediaUpload";
import { LISTING_ERROR_CODES, type MediaKind } from "../domain/types";
import {
  MEDIA_OBJECT_INSPECTOR,
  type MediaObjectInspector,
} from "../domain/ports/MediaObjectInspector";
import {
  MEDIA_UPLOAD_REPOSITORY,
  type MediaUploadRepository,
} from "../domain/ports/MediaUploadRepository";

export interface UploadClaim {
  key: string;
  kind: MediaKind;
}

/**
 * The trusted boundary for adopting uploaded media (ADR-0079). A key authorizes
 * nothing by itself: the server must hold an upload this User presigned, of the
 * expected kind, whose stored object still matches what presign recorded.
 *
 * It does not decide who adopts. That is the common claim's job (ADR-0088):
 * each caller reserves the uploads this guard returns before preparing bytes.
 */
@Injectable()
export class UploadAdoptionGuard {
  constructor(
    @Inject(MEDIA_UPLOAD_REPOSITORY)
    private readonly uploads: MediaUploadRepository,
    @Inject(MEDIA_OBJECT_INSPECTOR)
    private readonly objects: MediaObjectInspector,
  ) {}

  /** Returns the authorizing upload for each claim, in claim order. */
  async authorize(userId: string, claims: UploadClaim[]): Promise<MediaUpload[]> {
    const recorded = await this.uploads.findByKeys(claims.map((c) => c.key));
    const byKey = new Map(recorded.map((u) => [u.key, u]));

    const authorized: MediaUpload[] = claims.map((claim) => {
      const upload = byKey.get(claim.key);
      // Unknown, forged, another User's, wrong-kind and retired keys are
      // indistinguishable on purpose: object keys are public in Listing detail.
      if (!upload || upload.userId !== userId || upload.kind !== claim.kind ||
        upload.state === "RETIRED" || upload.state === "DELETED") {
        throw new BadRequestException({
          code: LISTING_ERROR_CODES.UPLOAD_NOT_AVAILABLE,
          message: "Upload is not available for this User",
        });
      }
      return upload;
    });

    // Storage is asked only after every key is known to be the caller's.
    await Promise.all(
      authorized.map(async (upload) => {
        const object = await this.objects.inspect(upload.key);
        if (!object || !storedObjectMatches(upload, object)) {
          throw new BadRequestException({
            code: LISTING_ERROR_CODES.UPLOAD_OBJECT_INVALID,
            message: "Uploaded file is missing or does not match the presigned upload",
          });
        }
      }),
    );
    return authorized;
  }
}
