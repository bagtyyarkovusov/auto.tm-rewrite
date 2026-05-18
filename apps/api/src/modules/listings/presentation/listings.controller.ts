import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Body,
  Req,
  BadRequestException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { Public } from "../../../common/public.decorator";
import { ArchiveListing } from "../application/ArchiveListing";
import { DeleteListing } from "../application/DeleteListing";
import { EditListing } from "../application/EditListing";
import { MarkSold } from "../application/MarkSold";
import { PublishListing } from "../application/PublishListing";
import { RepublishListing } from "../application/RepublishListing";
import { ListingsSchemas } from "@auto-tm/contracts";
import { z } from "zod";

@Controller("api/v1/listings")
export class ListingsController {
  constructor(
    @Inject(PublishListing) private readonly publishListingUC: PublishListing,
    @Inject(MarkSold) private readonly markSoldUC: MarkSold,
    @Inject(ArchiveListing) private readonly archiveListingUC: ArchiveListing,
    @Inject(RepublishListing) private readonly republishListingUC: RepublishListing,
    @Inject(DeleteListing) private readonly deleteListingUC: DeleteListing,
    @Inject(EditListing) private readonly editListingUC: EditListing,
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

  @Patch(":id")
  async edit(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;
    let parsed: typeof ListingsSchemas.EditListingRequestSchema._type;
    try {
      parsed = ListingsSchemas.EditListingRequestSchema.parse(body);
    } catch (err) {
      if (err && typeof err === "object" && "issues" in err) {
        const zodError = err as z.ZodError;
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: zodError.flatten(),
        });
      }
      throw err;
    }

    const result = await this.editListingUC.execute({ listingId, userId, patch: parsed });

    return {
      id: result.listing.id,
      sellerId: result.listing.sellerId,
      status: result.listing.status,
      brandId: result.listing.brandId,
      modelId: result.listing.modelId,
      generationId: result.listing.generationId,
      year: result.listing.year,
      vin: result.listing.vin,
      cityId: result.listing.cityId,
      regionId: result.listing.regionId,
      priceAmount: result.listing.priceAmount,
      priceCurrency: result.listing.priceCurrency,
      contactPhone: result.listing.contactPhone,
      allowCalls: result.listing.allowCalls,
      allowChat: result.listing.allowChat,
      condition: result.listing.condition,
      colorId: result.listing.colorId,
      bodyTypeId: result.listing.bodyTypeId,
      engineTypeId: result.listing.engineTypeId,
      transmissionId: result.listing.transmissionId,
      driveTypeId: result.listing.driveTypeId,
      enginePower: result.listing.enginePower,
      mileageKm: result.listing.mileageKm,
      locationText: result.listing.locationText,
      description: result.listing.description,
      publishedAt: result.listing.publishedAt.toISOString(),
      soldAt: result.listing.soldAt?.toISOString(),
      updatedAt: result.listing.updatedAt.toISOString(),
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
