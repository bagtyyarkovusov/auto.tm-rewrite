import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Listing } from "../domain/Listing";
import { toPriceTmt } from "../domain/Price";
import { LISTING_ERROR_CODES } from "../domain/types";
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from "../domain/ports/ListingRepository";
import {
  EXCHANGE_RATE_PORT,
  type ExchangeRatePort,
} from "../domain/ports/ExchangeRatePort";

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
    @Inject(EXCHANGE_RATE_PORT)
    private readonly exchangeRates: ExchangeRatePort,
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
    if (existing.status === "banned") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is banned and cannot be republished",
      });
    }

    const previousArchivedAt = existing.status === "archived" ? existing.updatedAt : undefined;
    const updated = existing.republish(new Date());

    // Back in the feed at today's rate, so price sort and range stay current.
    const rateToTmt =
      updated.priceCurrency === "TMT"
        ? 1
        : await this.exchangeRates.getRate(updated.priceCurrency, "TMT");
    if (rateToTmt <= 0) {
      throw new BadRequestException({
        code: LISTING_ERROR_CODES.EXCHANGE_RATE_MISSING,
        message: `Exchange rate from ${updated.priceCurrency} to TMT is not available`,
      });
    }
    const saved = await this.listings.update(updated, {
      priceTmt: toPriceTmt(updated.priceAmount, updated.priceCurrency, rateToTmt),
    });

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
