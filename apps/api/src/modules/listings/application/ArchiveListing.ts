import { Inject, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Listing } from "../domain/Listing";
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from "../domain/ports/ListingRepository";

export interface ArchiveListingInput {
  listingId: string;
  userId: string;
}

export interface ArchiveListingResult {
  listing: Listing;
}

@Injectable()
export class ArchiveListing {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ArchiveListingInput): Promise<ArchiveListingResult> {
    const existing = await this.listings.findById(input.listingId);
    if (!existing) {
      throw new NotFoundException("Listing not found");
    }
    if (existing.sellerId !== input.userId) {
      throw new ForbiddenException("Not the owner of this listing");
    }

    const previousStatus = existing.status;
    const updated = existing.archive();
    const saved = await this.listings.update(updated);

    await this.prisma.auditLog.create({
      data: {
        actorId: input.userId,
        action: "listing.archived",
        targetType: "Listing",
        targetId: saved.id,
        details: { previousStatus },
      },
    });

    return { listing: saved };
  }
}
