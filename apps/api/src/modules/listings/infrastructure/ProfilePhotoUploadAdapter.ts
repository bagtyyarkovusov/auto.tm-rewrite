import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";

import type { ProfilePhotoPort } from "../../identity/identity.public";
import { UploadAdoptionGuard } from "../application/UploadAdoptionGuard";
import { DomainError, LISTING_ERROR_CODES } from "../domain/types";
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

/**
 * Identity's Profile Photo port, served by the upload pipeline a Listing photo
 * uses (ADR-0088): the same ownership and stored-object check, the same common
 * claim with a `profile` target, and the same generator, which strips metadata
 * from the original and makes the variants. The image kind and its 5 MB cap
 * come from the presigned upload.
 *
 * Only a fenced (`conditional-v1`) upload is adopted. The worker deletes the
 * bytes of fenced uploads only, and a photo that is replaced or removed must
 * really leave storage.
 */
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
    const [upload] = await this.uploadGuard.authorize(input.userId, [
      { key: input.key, kind: "image" },
    ]);
    if (!upload || upload.writeProtocol !== "conditional-v1") {
      throw this.notAvailable();
    }

    // Reserve before any byte is prepared: from here this User's profile holds
    // the upload, or the request stops without touching storage.
    const reservation = await this.claims
      .reserve({
        userId: input.userId,
        uploadIds: [upload.id],
        target: { type: "profile", id: input.userId },
      })
      .catch((err: unknown) => {
        throw this.rejection(err);
      });
    // Only a User's current photo is adopted for their profile; a replaced or
    // removed one is retired and was refused above.
    if ("alreadyAdopted" in reservation) return { key: upload.key };
    // Another request for this key is still preparing it. Joining would run a
    // second generator over the same objects: their conditional writes fail
    // each other, and that failure retires the upload. This request prepares
    // nothing and leaves the claim alone; sent again later it answers the photo.
    if (reservation.joined) {
      throw new ConflictException({
        code: LISTING_ERROR_CODES.UPLOAD_ALREADY_ATTACHED,
        message: "Upload is already being set as the profile photo",
      });
    }

    try {
      const classification = await this.classifier.classify(upload.key);
      if (!classification.isAcceptable) {
        throw new BadRequestException({
          code: LISTING_ERROR_CODES.UPLOAD_OBJECT_INVALID,
          message: "Uploaded file cannot be used as a profile photo",
        });
      }
      await this.variantGenerator.generate(upload.key, { writeProtocol: upload.writeProtocol });
      await this.link.bind({
        userId: input.userId,
        uploadId: upload.id,
        key: upload.key,
        token: reservation.token,
      });
      return { key: upload.key };
    } catch (err) {
      // A failed preparation is terminal: the upload is retired and the User
      // presigns again. If that cannot be recorded now, the storage scanner
      // retires the stranded preparation after its deadline.
      await this.claims.abandon(reservation.token).catch(() => undefined);
      throw this.rejection(err);
    }
  }

  async release(userId: string, tx?: unknown): Promise<{ removedKey: string | null }> {
    return { removedKey: await this.link.unbind(userId, tx) };
  }

  private rejection(err: unknown): unknown {
    if (!(err instanceof DomainError)) return err;
    if (err.code === LISTING_ERROR_CODES.UPLOAD_ALREADY_ATTACHED) {
      return new ConflictException({
        code: err.code,
        message: "Upload is already attached to a Listing",
      });
    }
    if (err.code === LISTING_ERROR_CODES.UPLOAD_NOT_AVAILABLE) return this.notAvailable();
    return err;
  }

  /** The guard's own answer, so every unusable key reads the same. */
  private notAvailable(): BadRequestException {
    return new BadRequestException({
      code: LISTING_ERROR_CODES.UPLOAD_NOT_AVAILABLE,
      message: "Upload is not available for this User",
    });
  }
}
