import { Inject, Injectable } from "@nestjs/common";

import type { ProfilePhotoPort } from "../../identity/identity.public";
import { UploadAdoptionGuard } from "../application/UploadAdoptionGuard";
import {
  IMAGE_VARIANT_GENERATOR,
  type ImageVariantGenerator,
} from "../domain/ports/ImageVariantGenerator";
import {
  MEDIA_CONTENT_CLASSIFIER_PORT,
  type MediaContentClassifierPort,
} from "../domain/ports/MediaContentClassifierPort";
import {
  PROFILE_PHOTO_LINK_PORT,
  type ProfilePhotoLinkPort,
} from "../domain/ports/ProfilePhotoLinkPort";
import { UPLOAD_CLAIM_PORT, type UploadClaimPort } from "../domain/ports/UploadClaimPort";

@Injectable()
export class ProfilePhotoUploadAdapter implements ProfilePhotoPort {
  constructor(
    @Inject(UploadAdoptionGuard)
    private readonly uploadGuard: UploadAdoptionGuard,
    @Inject(UPLOAD_CLAIM_PORT)
    private readonly claims: UploadClaimPort,
    @Inject(MEDIA_CONTENT_CLASSIFIER_PORT)
    private readonly classifier: MediaContentClassifierPort,
    @Inject(IMAGE_VARIANT_GENERATOR)
    private readonly variantGenerator: ImageVariantGenerator,
    @Inject(PROFILE_PHOTO_LINK_PORT)
    private readonly link: ProfilePhotoLinkPort,
  ) {}

  async adopt(input: { userId: string; key: string }): Promise<{ key: string }> {
    // Skeleton for the failing-test checkpoint (#642); no behaviour yet.
    return { key: input.key };
  }

  async release(_userId: string, _tx?: unknown): Promise<{ removedKey: string | null }> {
    // Skeleton for the failing-test checkpoint (#642); no behaviour yet.
    return { removedKey: null };
  }
}
