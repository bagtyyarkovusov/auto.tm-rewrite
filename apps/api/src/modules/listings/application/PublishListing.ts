import { randomUUID } from "node:crypto";

import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import { AuthSchemas, ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import {
  IDENTITY_CLOCK_PORT,
  type ClockPort,
} from "../../identity/identity.public";
import { ContactPhonePolicy } from "../domain/ContactPhonePolicy";
import { Listing } from "../domain/Listing";
import { toPriceTmt } from "../domain/Price";
import { resolveDamagedAnswer } from "../domain/damagedAnswer";
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
import {
  UPLOAD_CLAIM_PORT,
  type UploadClaimPort,
} from "../domain/ports/UploadClaimPort";

import { contactPhoneRejection } from "./contactPhoneRejection";
import { UploadAdoptionGuard } from "./UploadAdoptionGuard";

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
}).extend({
  // Required even when calls are off (D7); whether it is confirmed is the
  // policy check after parsing (ADR-0081).
  contactPhone: AuthSchemas.PhoneTm,
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
).superRefine((data, ctx) => {
  const answer = resolveDamagedAnswer(data.condition, data.conditionDisclosure?.damaged);
  if (!answer.ok) {
    ctx.addIssue({
      code: "custom",
      message: answer.code,
      path: ["conditionDisclosure", "damaged"],
      params: { message: answer.message },
    });
  }
});

/** PrismaPg 7 reports constraint fields under its driver-adapter cause. */
function isUploadUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const error = err as {
    code?: unknown;
    meta?: { driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } } };
  };
  const fields = error.meta?.driverAdapterError?.cause?.constraint?.fields;
  return error.code === "P2002" && Array.isArray(fields) && fields.length === 1 &&
    (fields[0] === "uploadId" || fields[0] === '"uploadId"');
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2003";
}

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
    @Inject(UploadAdoptionGuard)
    private readonly uploadGuard: UploadAdoptionGuard,
    @Inject(ContactPhonePolicy)
    private readonly contactPhones: ContactPhonePolicy,
    @Inject(IDENTITY_CLOCK_PORT)
    private readonly clock: ClockPort,
    @Inject(UPLOAD_CLAIM_PORT)
    private readonly claims: UploadClaimPort,
  ) {}

  async execute(input: PublishListingInput): Promise<PublishListingResult> {
    const draft = await this.drafts.findById(input.draftId);
    if (!draft) {
      throw new NotFoundException("Draft not found");
    }
    if (draft.userId !== input.userId) {
      throw new ForbiddenException("Not the owner of this draft");
    }
    const now = this.clock.now();

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
        // ADR-0080: a damaged New car gets its own code so the seller can be
        // told to choose Used. A missing answer stays a payload field error.
        const damagedIssue = zodError.issues.find(
          (i) => i.message === LISTING_ERROR_CODES.DAMAGED_NOT_ALLOWED_FOR_NEW,
        );
        if (damagedIssue?.code === "custom") {
          throw new BadRequestException({
            code: LISTING_ERROR_CODES.DAMAGED_NOT_ALLOWED_FOR_NEW,
            message: damagedIssue.params?.["message"],
            details: { field: "conditionDisclosure.damaged" },
          });
        }
        if (zodError.issues.every((i) => i.path[0] === "contactPhone")) {
          // When the phone is the only gap: missing or blank answers
          // CONTACT_PHONE_REQUIRED; free text left in an older draft is a
          // number nobody confirmed. Otherwise every missing field is listed.
          const raw = (draft.payload as { contactPhone?: unknown }).contactPhone;
          const standing = await this.contactPhones.standing(
            input.userId,
            typeof raw === "string" ? raw : null,
            now,
          );
          throw contactPhoneRejection(standing) ?? contactPhoneRejection({ kind: "not_confirmed" });
        }
        throw new BadRequestException({
          code: "INVALID_DRAFT_PAYLOAD",
          message: "Draft is missing required fields",
          details: zodError.flatten(),
        });
      }
      throw err;
    }

    // The schema above refused every Damaged answer this rule rejects.
    const damagedAnswer = resolveDamagedAnswer(payload.condition, payload.conditionDisclosure?.damaged);
    const damaged = damagedAnswer.ok ? damagedAnswer.damaged : null;
    const rejection = contactPhoneRejection(
      await this.contactPhones.standing(input.userId, payload.contactPhone, now),
    );
    if (rejection) throw rejection;

    const rateToTmt =
      payload.priceCurrency === "TMT"
        ? 1
        : await this.exchangeRates.getRate(payload.priceCurrency, "TMT");
    if (rateToTmt <= 0) {
      throw new BadRequestException({
        code: LISTING_ERROR_CODES.EXCHANGE_RATE_MISSING,
        message: `Exchange rate from ${payload.priceCurrency} to TMT is not available`,
      });
    }
    const priceTmt = toPriceTmt(payload.priceAmount, payload.priceCurrency, rateToTmt);

    const listingId = randomUUID();

    const photos = payload.photos;
    if (!photos) throw new BadRequestException({ code: "INVALID_DRAFT_PAYLOAD", message: "Photos are required" });
    const attachedPhotos = photos.filter((photo) => photo.key);

    // A draft's photo keys are only strings. Each must be an upload this User
    // presigned and has not adopted elsewhere (ADR-0079); the unique upload link
    // on the media row below makes that single-use even under a race.
    const photoKeys = attachedPhotos.map((photo) => photo.key as string);
    if (new Set(photoKeys).size !== photoKeys.length) {
      throw new BadRequestException({
        code: "INVALID_DRAFT_PAYLOAD",
        message: "A photo key can be used only once",
      });
    }
    const uploads = await this.uploadGuard.authorize(
      draft.userId,
      photoKeys.map((key) => ({ key, kind: "image" as const })),
    );
    if (uploads.some((upload) => upload.adopted)) {
      throw new ConflictException({
        code: LISTING_ERROR_CODES.UPLOAD_ALREADY_ATTACHED,
        message: "A photo upload is already attached to a Listing",
      });
    }
    const uploadIdByKey = new Map(uploads.map((upload) => [upload.key, upload.id]));

    await Promise.all(
      attachedPhotos.map((photo) =>
        this.variantGenerator.generate(photo.key as string, {
          writeProtocol: uploads.find((upload) => upload.key === photo.key)?.writeProtocol ?? "legacy",
        }),
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
            priceTmt,
            contactPhone: payload.contactPhone,
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
            damaged,
            knownIssuesText: payload.conditionDisclosure?.knownIssuesText ?? null,
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
              uploadId: uploadIdByKey.get(photo.key as string) as string,
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
        publicNumber: listingRow.publicNumber,
        sellerId: listingRow.sellerId,
        status: listingRow.status as "active" | "sold" | "archived",
        brandId: listingRow.brandId,
        modelId: listingRow.modelId,
        cityId: listingRow.cityId,
        priceAmount: listingRow.priceAmount,
        priceCurrency: listingRow.priceCurrency as "TMT" | "USD" | "AED",
        allowCalls: listingRow.allowCalls,
        allowChat: listingRow.allowChat,
        publishedAt: listingRow.publishedAt ?? now,
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
        ...(listingRow.damaged !== null
          ? {
              conditionDisclosure: {
                damaged: listingRow.damaged,
                ...(listingRow.knownIssuesText ? { knownIssuesText: listingRow.knownIssuesText } : {}),
              },
            }
          : {}),
      });

      await this.events.emit({
        event: "ListingCreated",
        listingId: listing.id,
        sellerId: listing.sellerId,
      });

      return { listing };
    } catch (err) {
      if (isUploadUniqueViolation(err) && (await this.uploadGuard.anyAdopted(photoKeys))) {
        // A concurrent attach or publish adopted one of these uploads first. The
        // whole transaction rolled back, so nothing was published.
        throw new ConflictException({
          code: LISTING_ERROR_CODES.UPLOAD_ALREADY_ATTACHED,
          message: "A photo upload is already attached to a Listing",
        });
      }
      if (isForeignKeyViolation(err) && (await this.uploadGuard.anyUnavailable(photoKeys))) {
        // Adoption followed by removal can erase the upload after authorization.
        // A different foreign-key failure retains its original error.
        throw new BadRequestException({
          code: LISTING_ERROR_CODES.UPLOAD_NOT_AVAILABLE,
          message: "A photo upload is no longer available",
        });
      }
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
