import { Inject, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from "../domain/ports/ListingRepository";
import {
  LISTING_EVENT_PUBLISHER,
  type ListingEventPublisher,
} from "../domain/ports/ListingEventPublisher";

export interface DeleteListingInput {
  listingId: string;
  userId: string;
}

@Injectable()
export class DeleteListing {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(LISTING_EVENT_PUBLISHER)
    private readonly events: ListingEventPublisher,
  ) {}

  async execute(input: DeleteListingInput): Promise<void> {
    const existing = await this.listings.findById(input.listingId);
    if (!existing) {
      throw new NotFoundException("Listing not found");
    }
    if (existing.sellerId !== input.userId) {
      throw new ForbiddenException("Not the owner of this listing");
    }
    if (existing.status === "banned") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is banned and cannot be deleted",
      });
    }

    const mediaCount = await this.prisma.listingMedia.count({
      where: { listingId: existing.id },
    });

    await this.listings.softDelete(existing.id, new Date());

    await this.prisma.auditLog.create({
      data: {
        actorId: input.userId,
        action: "listing.deleted",
        targetType: "Listing",
        targetId: existing.id,
        details: {
          status: existing.status,
          mediaCount,
        },
      },
    });

    await this.events.emit({
      event: "ListingDeleted",
      listingId: existing.id,
      sellerId: existing.sellerId,
    });
  }
}
