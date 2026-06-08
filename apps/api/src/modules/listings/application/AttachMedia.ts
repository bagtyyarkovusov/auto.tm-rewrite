import { randomUUID } from "node:crypto";

import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";

import { ListingMedia } from "../domain/ListingMedia";
import { LISTING_ERROR_CODES } from "../domain/types";
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from "../domain/ports/ListingRepository";
import {
  LISTING_MEDIA_REPOSITORY,
  type ListingMediaRepository,
} from "../domain/ports/ListingMediaRepository";
import {
  MEDIA_CONTENT_CLASSIFIER_PORT,
  type MediaContentClassifierPort,
} from "../domain/ports/MediaContentClassifierPort";
import {
  IMAGE_VARIANT_GENERATOR,
  type ImageVariantGenerator,
} from "../domain/ports/ImageVariantGenerator";

export interface AttachMediaInput {
  listingId: string;
  userId: string;
  key: string;
  kind: "image" | "video";
  sortOrder: number;
  width?: number | undefined;
  height?: number | undefined;
  durationMs?: number | undefined;
  posterKey?: string | undefined;
}

export interface AttachMediaResult {
  media: ListingMedia;
}

@Injectable()
export class AttachMedia {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(LISTING_MEDIA_REPOSITORY)
    private readonly mediaRepo: ListingMediaRepository,
    @Inject(MEDIA_CONTENT_CLASSIFIER_PORT)
    private readonly classifier: MediaContentClassifierPort,
    @Inject(IMAGE_VARIANT_GENERATOR)
    private readonly variantGenerator: ImageVariantGenerator,
  ) {}

  async execute(input: AttachMediaInput): Promise<AttachMediaResult> {
    const listing = await this.listings.findById(input.listingId);
    if (!listing || listing.sellerId !== input.userId || listing.deletedAt) {
      throw new NotFoundException("Listing not found");
    }
    if (listing.status === "banned") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is banned and media cannot be attached",
      });
    }

    const existingMedia = await this.mediaRepo.findByListingId(input.listingId);

    const photoCount = existingMedia.filter((m) => m.kind === "image").length;
    const videoCount = existingMedia.filter((m) => m.kind === "video").length;

    if (input.kind === "image" && photoCount >= 20) {
      throw new BadRequestException({
        code: LISTING_ERROR_CODES.MEDIA_LIMIT_EXCEEDED,
        message: "Maximum 20 photos per listing",
      });
    }
    if (input.kind === "video" && videoCount >= 1) {
      throw new BadRequestException({
        code: LISTING_ERROR_CODES.MEDIA_LIMIT_EXCEEDED,
        message: "Maximum 1 video per listing",
      });
    }

    const classification = await this.classifier.classify(input.key);
    if (!classification.isAcceptable) {
      // Branch exists for Phase 2 ML classifier; in S4 this never triggers
      return {
        media: ListingMedia.create({
          id: randomUUID(),
          listingId: input.listingId,
          kind: input.kind,
          key: input.key,
          sortOrder: input.sortOrder,
          ...(input.width !== undefined ? { width: input.width } : {}),
          ...(input.height !== undefined ? { height: input.height } : {}),
          ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
          ...(input.posterKey !== undefined ? { posterKey: input.posterKey } : {}),
        }),
      };
    }

    if (input.kind === "image") {
      await this.variantGenerator.generate(input.key);
    }

    const media = ListingMedia.create({
      id: randomUUID(),
      listingId: input.listingId,
      kind: input.kind,
      key: input.key,
      sortOrder: input.sortOrder,
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
      ...(input.posterKey !== undefined ? { posterKey: input.posterKey } : {}),
    });

    const saved = await this.mediaRepo.save(media);
    return { media: saved };
  }
}
