import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { ListingsSchemas } from "@auto-tm/contracts";

import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from "../domain/ports/ListingRepository";
import {
  LISTING_MEDIA_REPOSITORY,
  type ListingMediaRepository,
} from "../domain/ports/ListingMediaRepository";
import { DomainError } from "../domain/types";

export interface RemoveMediaInput {
  listingId: string;
  mediaId: string;
  userId: string;
}

@Injectable()
export class RemoveMedia {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(LISTING_MEDIA_REPOSITORY)
    private readonly mediaRepo: ListingMediaRepository,
  ) {}

  async execute(input: RemoveMediaInput): Promise<void> {
    const listing = await this.listings.findById(input.listingId);
    if (!listing || listing.sellerId !== input.userId || listing.deletedAt) {
      throw new NotFoundException("Listing not found");
    }
    if (listing.status === "banned") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is banned and media cannot be removed",
      });
    }

    const media = await this.mediaRepo.findById(input.mediaId);
    if (!media || media.listingId !== input.listingId) {
      throw new NotFoundException("Media not found");
    }

    // Deleting the row retires the upload it adopted in the same transaction and
    // records its deletion work (ADR-0088). The request deletes no stored object:
    // the cleanup worker does, once nothing live references the directory.
    const { removed } = await this.mediaRepo.deleteReleasingUpload(
      input.mediaId, ListingsSchemas.MIN_LISTING_PHOTOS,
    ).catch((error: unknown) => {
      if (error instanceof DomainError && error.code === "PHOTO_MINIMUM_REQUIRED") {
        throw new BadRequestException({ code: error.code, message: error.message, details: { minimum: ListingsSchemas.MIN_LISTING_PHOTOS } });
      }
      throw error;
    });
    if (!removed) {
      throw new NotFoundException("Media not found");
    }
  }
}
