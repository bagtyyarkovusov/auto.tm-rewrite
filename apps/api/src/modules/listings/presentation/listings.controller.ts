import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Body,
  Req,
  Query,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ListingsSchemas, AdminSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { Public } from "../../../common/public.decorator";
import { IDENTITY_TOKENS } from "../../identity/identity.tokens";
import type { IdentityCheckPort } from "../../identity/domain/ports/IdentityCheckPort";
import { ArchiveListing } from "../application/ArchiveListing";
import { DeleteListing } from "../application/DeleteListing";
import { EditListing } from "../application/EditListing";
import { MarkSold } from "../application/MarkSold";
import { PublishListing } from "../application/PublishListing";
import { RepublishListing } from "../application/RepublishListing";
import { AttachMedia } from "../application/AttachMedia";
import { RemoveMedia } from "../application/RemoveMedia";
import { ReorderMedia } from "../application/ReorderMedia";
import { GetListingDetail } from "../application/GetListingDetail";
import { ListFeed } from "../application/ListFeed";
import { ListingFilter } from "../domain/ListingFilter";
import { DomainError, type ListingFilterCriteria } from "../domain/types";

@Controller("api/v1/listings")
export class ListingsController {
  constructor(
    @Inject(PublishListing) private readonly publishListingUC: PublishListing,
    @Inject(MarkSold) private readonly markSoldUC: MarkSold,
    @Inject(ArchiveListing) private readonly archiveListingUC: ArchiveListing,
    @Inject(RepublishListing) private readonly republishListingUC: RepublishListing,
    @Inject(DeleteListing) private readonly deleteListingUC: DeleteListing,
    @Inject(EditListing) private readonly editListingUC: EditListing,
    @Inject(AttachMedia) private readonly attachMediaUC: AttachMedia,
    @Inject(RemoveMedia) private readonly removeMediaUC: RemoveMedia,
    @Inject(ReorderMedia) private readonly reorderMediaUC: ReorderMedia,
    @Inject(GetListingDetail) private readonly getListingDetailUC: GetListingDetail,
    @Inject(ListFeed) private readonly listFeedUC: ListFeed,
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
  ) {}

  private async assertNotSuspended(userId: string): Promise<void> {
    const suspended = await this.identityCheck.isSuspended(userId);
    if (suspended) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }
  }

  @Public()
  @Get("ping")
  ping(): { context: "listings"; status: "ok" } {
    return { context: "listings", status: "ok" };
  }

  @Public()
  @Get()
  async listFeed(@Query() query: unknown) {
    let parsed: typeof ListingsSchemas.FeedQuerySchema._type;
    try {
      parsed = ListingsSchemas.FeedQuerySchema.parse(query);
    } catch (err) {
      if (err && typeof err === "object" && "issues" in err) {
        const zodError = err as z.ZodError;
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: zodError.flatten(),
        });
      }
      throw err;
    }

    const { cursor, limit, ...filterFields } = parsed;

    const filters: ListingFilterCriteria = {};
    if (filterFields.brandId !== undefined) filters.brandId = filterFields.brandId;
    if (filterFields.modelId !== undefined) filters.modelId = filterFields.modelId;
    if (filterFields.cityId !== undefined) filters.cityId = filterFields.cityId;
    if (filterFields.priceMin !== undefined) filters.priceMin = filterFields.priceMin;
    if (filterFields.priceMax !== undefined) filters.priceMax = filterFields.priceMax;
    if (filterFields.yearMin !== undefined) filters.yearMin = filterFields.yearMin;
    if (filterFields.yearMax !== undefined) filters.yearMax = filterFields.yearMax;
    if (filterFields.condition !== undefined) filters.condition = filterFields.condition;

    if (Object.keys(filters).length > 0) {
      try {
        ListingFilter.create(filters);
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException({
            code: "VALIDATION_ERROR",
            message: err.message,
            details: { reason: err.code },
          });
        }
        throw err;
      }
    }

    return this.listFeedUC.execute({
      ...(cursor !== undefined ? { cursor } : {}),
      limit,
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
    });
  }

  @Public()
  @Get(":id")
  async getDetail(@Param("id") listingId: string, @Req() req: FastifyRequest) {
    const requestingUserId = (req as { user?: { sub: string } }).user?.sub;
    return this.getListingDetailUC.execute({ listingId, requestingUserId });
  }



  @Post("drafts/:id/publish")
  async publishDraft(
    @Param("id") draftId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;
    await this.assertNotSuspended(userId);

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
    await this.assertNotSuspended(userId);

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
    await this.assertNotSuspended(userId);

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
    await this.assertNotSuspended(userId);

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
    await this.assertNotSuspended(userId);
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
      acceptsExchange: result.listing.acceptsExchange,
      installmentAvailable: result.listing.installmentAvailable,
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
      conditionDisclosure: result.listing.conditionDisclosure,
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
    await this.assertNotSuspended(userId);

    await this.deleteListingUC.execute({ listingId, userId });

    return { success: true };
  }

  @Post(":id/media/attach")
  async attachMedia(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;
    await this.assertNotSuspended(userId);
    let parsed: typeof ListingsSchemas.AttachMediaRequestSchema._type;
    try {
      parsed = ListingsSchemas.AttachMediaRequestSchema.parse(body);
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

    const result = await this.attachMediaUC.execute({
      listingId,
      userId,
      ...parsed,
    });

    return {
      id: result.media.id,
      listingId: result.media.listingId,
      kind: result.media.kind,
      key: result.media.key,
      sortOrder: result.media.sortOrder,
      width: result.media.width,
      height: result.media.height,
      durationMs: result.media.durationMs,
      posterKey: result.media.posterKey,
      createdAt: result.media.createdAt.toISOString(),
    };
  }

  @Delete(":id/media/:mediaId")
  async removeMedia(
    @Param("id") listingId: string,
    @Param("mediaId") mediaId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;
    await this.assertNotSuspended(userId);

    await this.removeMediaUC.execute({ listingId, mediaId, userId });

    return { success: true };
  }

  @Put(":id/media/order")
  async reorderMedia(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;
    await this.assertNotSuspended(userId);
    let parsed: typeof ListingsSchemas.ReorderMediaRequestSchema._type;
    try {
      parsed = ListingsSchemas.ReorderMediaRequestSchema.parse(body);
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

    await this.reorderMediaUC.execute({
      listingId,
      userId,
      ordering: parsed.ordering,
    });

    return { success: true };
  }
}
