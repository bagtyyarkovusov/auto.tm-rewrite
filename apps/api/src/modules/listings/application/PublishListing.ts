import { randomUUID } from "node:crypto";

import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { Listing } from "../domain/Listing";
import { DomainError, LISTING_ERROR_CODES } from "../domain/types";
import {
  LISTING_DRAFT_REPOSITORY,
  type ListingDraftRepository,
} from "../domain/ports/ListingDraftRepository";
import {
  EXCHANGE_RATE_PORT,
  type ExchangeRatePort,
} from "../domain/ports/ExchangeRatePort";
import {
  LISTING_EVENT_PUBLISHER,
  type ListingEventPublisher,
} from "../domain/ports/ListingEventPublisher";
import {
  IMAGE_VARIANT_GENERATOR,
  type ImageVariantGenerator,
} from "../domain/ports/ImageVariantGenerator";

const PublishablePayloadSchema = ListingsSchemas.ListingDraftPayloadSchema.required({
  brandId: true,
  modelId: true,
  year: true,
  cityId: true,
  regionId: true,
  priceAmount: true,
  priceCurrency: true,
  condition: true,
  description: true,
  allowCalls: true,
  allowChat: true,
}).refine(
  (data) => data.allowCalls || data.allowChat,
  { message: "CONTACT_METHOD_REQUIRED" },
).refine(
  (data) => data.photos && data.photos.length >= 1 && data.photos.some((p) => p.key),
  { message: "AT_LEAST_ONE_PHOTO_REQUIRED" },
).refine(
  (data) => data.description.trim().length > 0,
  { message: "DESCRIPTION_REQUIRED" },
).refine(
  (data) => {
    if (data.condition === "used") {
      return data.mileageKm !== undefined && data.mileageKm !== null;
    }
    return true;
  },
  { message: "MILEAGE_REQUIRED_FOR_USED" },
);

export interface PublishListingInput {
  draftId: string;
  userId: string;
}

export interface PublishListingResult {
  listing: Listing;
}

@Injectable()
export class PublishListing {
  constructor(
    @Inject(LISTING_DRAFT_REPOSITORY)
    private readonly drafts: ListingDraftRepository,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EXCHANGE_RATE_PORT)
    private readonly exchangeRates: ExchangeRatePort,
    @Inject(LISTING_EVENT_PUBLISHER)
    private readonly events: ListingEventPublisher,
    @Inject(IMAGE_VARIANT_GENERATOR)
    private readonly variantGenerator: ImageVariantGenerator,
  ) {}

  async execute(input: PublishListingInput): Promise<PublishListingResult> {
    const draft = await this.drafts.findById(input.draftId);
    if (!draft) {
      throw new NotFoundException("Draft not found");
    }
    if (draft.userId !== input.userId) {
      throw new ForbiddenException("Not the owner of this draft");
    }

    let payload: z.infer<typeof PublishablePayloadSchema>;
    try {
      payload = PublishablePayloadSchema.parse(draft.payload);
    } catch (err) {
      if (err && typeof err === "object" && "issues" in err) {
        const zodError = err as z.ZodError;
        const contactIssue = zodError.issues.find(
          (i) => i.message === "CONTACT_METHOD_REQUIRED",
        );
        if (contactIssue) {
          throw new BadRequestException({
            code: LISTING_ERROR_CODES.CONTACT_METHOD_REQUIRED,
            message: "At least one contact method must be enabled",
          });
        }
        throw new BadRequestException({
          code: "INVALID_DRAFT_PAYLOAD",
          message: "Draft is missing required fields",
          details: zodError.flatten(),
        });
      }
      throw err;
    }

    if (payload.priceCurrency !== "TMT") {
      const rate = await this.exchangeRates.getRate(payload.priceCurrency, "TMT");
      if (rate <= 0) {
        throw new BadRequestException({
          code: LISTING_ERROR_CODES.EXCHANGE_RATE_MISSING,
          message: `Exchange rate from ${payload.priceCurrency} to TMT is not available`,
        });
      }
    }

    const now = new Date();
    const listingId = randomUUID();

    const photos = payload.photos;
    if (!photos) throw new BadRequestException({ code: "INVALID_DRAFT_PAYLOAD", message: "Photos are required" });
    const attachedPhotos = photos.filter((photo) => photo.key);

    await Promise.all(
      attachedPhotos.map((photo) =>
        this.variantGenerator.generate(photo.key as string),
      ),
    );

    try {
      const [listingRow] = await this.prisma.$transaction([
        this.prisma.listing.create({
          data: {
            id: listingId,
            sellerId: input.userId,
            status: "active",
            brandId: payload.brandId,
            modelId: payload.modelId,
            generationId: payload.generationId ?? null,
            year: payload.year ?? null,
            vin: payload.vin ?? null,
            cityId: payload.cityId,
            regionId: payload.regionId ?? null,
            priceAmount: payload.priceAmount,
            priceCurrency: payload.priceCurrency,
            contactPhone: payload.contactPhone ?? null,
            allowCalls: payload.allowCalls,
            allowChat: payload.allowChat,
            publishedAt: now,
            condition: payload.condition,
            colorId: payload.colorId ?? null,
            bodyTypeId: payload.bodyTypeId ?? null,
            engineTypeId: payload.engineTypeId ?? null,
            transmissionId: payload.transmissionId ?? null,
            driveTypeId: payload.driveTypeId ?? null,
            enginePower: payload.enginePower ?? null,
            mileageKm: payload.mileageKm ?? null,
            locationText: payload.locationText ?? null,
            description: payload.description,
            acceptsExchange: payload.acceptsExchange ?? false,
            installmentAvailable: payload.installmentAvailable ?? false,
          },
        }),
        ...attachedPhotos.map((photo) =>
          this.prisma.listingMedia.create({
            data: {
              id: photo.photoId,
              listingId,
              kind: "image",
              key: photo.key as string,
              sortOrder: photo.sortOrder,
            },
          }),
        ),
        this.prisma.listingDraft.delete({ where: { id: draft.id } }),
        this.prisma.auditLog.create({
          data: {
            actorId: input.userId,
            action: "listing.published",
            targetType: "Listing",
            targetId: listingId,
            details: {
              brandId: payload.brandId,
              modelId: payload.modelId,
              cityId: payload.cityId,
              priceAmount: payload.priceAmount,
              priceCurrency: payload.priceCurrency,
            },
          },
        }),
      ]);

      const listing = Listing.create({
        id: listingRow.id,
        sellerId: listingRow.sellerId,
        status: listingRow.status as "active" | "sold" | "archived",
        brandId: listingRow.brandId,
        modelId: listingRow.modelId,
        cityId: listingRow.cityId,
        priceAmount: listingRow.priceAmount,
        priceCurrency: listingRow.priceCurrency as "TMT" | "USD" | "AED",
        allowCalls: listingRow.allowCalls,
        allowChat: listingRow.allowChat,
        publishedAt: listingRow.publishedAt ?? new Date(),
        createdAt: listingRow.createdAt,
        updatedAt: listingRow.updatedAt,
        ...(listingRow.generationId ? { generationId: listingRow.generationId } : {}),
        ...(listingRow.year ? { year: listingRow.year } : {}),
        ...(listingRow.vin ? { vin: listingRow.vin } : {}),
        ...(listingRow.regionId ? { regionId: listingRow.regionId } : {}),
        ...(listingRow.contactPhone ? { contactPhone: listingRow.contactPhone } : {}),
        ...(listingRow.condition ? { condition: listingRow.condition as "new" | "used" } : {}),
        ...(listingRow.colorId ? { colorId: listingRow.colorId } : {}),
        ...(listingRow.bodyTypeId ? { bodyTypeId: listingRow.bodyTypeId } : {}),
        ...(listingRow.engineTypeId ? { engineTypeId: listingRow.engineTypeId } : {}),
        ...(listingRow.transmissionId ? { transmissionId: listingRow.transmissionId } : {}),
        ...(listingRow.driveTypeId ? { driveTypeId: listingRow.driveTypeId } : {}),
        ...(listingRow.enginePower ? { enginePower: listingRow.enginePower } : {}),
        ...(listingRow.mileageKm ? { mileageKm: listingRow.mileageKm } : {}),
        ...(listingRow.locationText ? { locationText: listingRow.locationText } : {}),
        ...(listingRow.description ? { description: listingRow.description } : {}),
        acceptsExchange: listingRow.acceptsExchange,
        installmentAvailable: listingRow.installmentAvailable,
      });

      await this.events.emit({
        event: "ListingCreated",
        listingId: listing.id,
        sellerId: listing.sellerId,
      });

      return { listing };
    } catch (err) {
      if (err instanceof DomainError) {
        throw new BadRequestException({
          code: err.code,
          message: err.message,
        });
      }
      throw err;
    }
  }
}
