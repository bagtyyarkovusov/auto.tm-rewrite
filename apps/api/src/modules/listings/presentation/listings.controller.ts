import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { Public } from "../../../common/public.decorator";
import { ArchiveListing } from "../application/ArchiveListing";
import { DeleteListing } from "../application/DeleteListing";
import { MarkSold } from "../application/MarkSold";
import { PublishListing } from "../application/PublishListing";
import { RepublishListing } from "../application/RepublishListing";

@Controller("api/v1/listings")
export class ListingsController {
  constructor(
    @Inject(PublishListing) private readonly publishListingUC: PublishListing,
    @Inject(MarkSold) private readonly markSoldUC: MarkSold,
    @Inject(ArchiveListing) private readonly archiveListingUC: ArchiveListing,
    @Inject(RepublishListing) private readonly republishListingUC: RepublishListing,
    @Inject(DeleteListing) private readonly deleteListingUC: DeleteListing,
  ) {}

  @Public()
  @Get("ping")
  ping(): { context: "listings"; status: "ok" } {
    return { context: "listings", status: "ok" };
  }

  @Post("drafts/:id/publish")
  async publishDraft(
    @Param("id") draftId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;

    const result = await this.publishListingUC.execute({ draftId, userId });

    return {
      id: result.listing.id,
      sellerId: result.listing.sellerId,
      status: result.listing.status,
      brandId: result.listing.brandId,
      modelId: result.listing.modelId,
      priceAmount: result.listing.priceAmount,
      priceCurrency: result.listing.priceCurrency,
      publishedAt: result.listing.publishedAt.toISOString(),
    };
  }

  @Post(":id/sold")
  async markSold(
    @Param("id") listingId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;

    const result = await this.markSoldUC.execute({ listingId, userId });

    return {
      id: result.listing.id,
      status: result.listing.status,
      soldAt: result.listing.soldAt?.toISOString(),
    };
  }

  @Post(":id/archive")
  async archive(
    @Param("id") listingId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;

    const result = await this.archiveListingUC.execute({ listingId, userId });

    return {
      id: result.listing.id,
      status: result.listing.status,
    };
  }

  @Post(":id/republish")
  async republish(
    @Param("id") listingId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;

    const result = await this.republishListingUC.execute({ listingId, userId });

    return {
      id: result.listing.id,
      status: result.listing.status,
      publishedAt: result.listing.publishedAt.toISOString(),
    };
  }

  @Delete(":id")
  async delete(
    @Param("id") listingId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;

    await this.deleteListingUC.execute({ listingId, userId });

    return { success: true };
  }
}
