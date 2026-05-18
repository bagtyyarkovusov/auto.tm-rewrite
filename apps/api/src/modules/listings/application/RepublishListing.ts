import { Inject, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Listing } from "../domain/Listing";
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from "../domain/ports/ListingRepository";

export interface RepublishListingInput {
  listingId: string;
  userId: string;
}

export interface RepublishListingResult {
  listing: Listing;
}

@Injectable()
export class RepublishListing {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: RepublishListingInput): Promise<RepublishListingResult> {
    const existing = await this.listings.findById(input.listingId);
    if (!existing) {
      throw new NotFoundException("Listing not found");
    }
    if (existing.sellerId !== input.userId) {
      throw new ForbiddenException("Not the owner of this listing");
    }
    if (existing.deletedAt) {
      throw new NotFoundException("Listing not found");
    }

    const previousArchivedAt = existing.status === "archived" ? existing.updatedAt : undefined;
    const updated = existing.republish(new Date());
    const saved = await this.listings.update(updated);

    await this.prisma.auditLog.create({
      data: {
        actorId: input.userId,
        action: "listing.republished",
        targetType: "Listing",
        targetId: saved.id,
        details: {
          previousArchivedAt: previousArchivedAt?.toISOString() ?? null,
        },
      },
    });

    return { listing: saved };
  }
}
