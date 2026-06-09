import { z } from "zod";

import { Currency, ListingCondition, ListingStatus } from "../enums";

// ── Shared enums as Zod schemas ──

export const ListingStatusSchema = z.nativeEnum(ListingStatus);
export type ListingStatusType = z.infer<typeof ListingStatusSchema>;

export const CurrencySchema = z.nativeEnum(Currency);
export type CurrencyType = z.infer<typeof CurrencySchema>;

export const ListingConditionSchema = z.nativeEnum(ListingCondition);
export type ListingConditionType = z.infer<typeof ListingConditionSchema>;

// ── ListingSummary (cross-context read surface) ──

export const ListingSummarySchema = z.object({
  id: z.string().uuid(),
  sellerId: z.string().uuid(),
  status: ListingStatusSchema,
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  year: z.number().int().optional(),
  priceAmount: z.number().positive(),
  priceCurrency: CurrencySchema,
  displayPriceTmt: z.number().positive(),
  coverMediaKey: z.string().optional(),
  cityId: z.string().uuid(),
  publishedAt: z.string().datetime(),
});
export type ListingSummary = z.infer<typeof ListingSummarySchema>;

// ── ListingMedia ──

export const MediaVariantSchema = z.object({
  thumbnail: z.string(),
  list: z.string(),
  detail: z.string(),
  fullscreen: z.string(),
});
export type MediaVariant = z.infer<typeof MediaVariantSchema>;

export const ListingMediaSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["image", "video"]),
  key: z.string(),
  variants: MediaVariantSchema,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sortOrder: z.number().int().nonnegative(),
  durationMs: z.number().int().positive().optional(),
  posterKey: z.string().optional(),
});
export type ListingMedia = z.infer<typeof ListingMediaSchema>;

// ── ListingDetail ──

export const ListingDetailSchema = z.object({
  id: z.string().uuid(),
  sellerId: z.string().uuid(),
  status: ListingStatusSchema,
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  generationId: z.string().uuid().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  vin: z.string().optional(),
  condition: ListingConditionSchema.optional(),
  mileageKm: z.number().int().nonnegative().optional(),
  colorId: z.string().uuid().optional(),
  bodyTypeId: z.string().uuid().optional(),
  transmissionId: z.string().uuid().optional(),
  driveTypeId: z.string().uuid().optional(),
  engineTypeId: z.string().uuid().optional(),
  enginePower: z.number().int().positive().optional(),
  priceAmount: z.number().positive(),
  priceCurrency: CurrencySchema,
  displayPriceTmt: z.number().positive(),
  description: z.string().max(2000).optional(),
  regionId: z.string().uuid(),
  cityId: z.string().uuid(),
  locationText: z.string().optional(),
  contactPhone: z.string().optional(),
  allowCalls: z.boolean(),
  allowChat: z.boolean(),
  acceptsExchange: z.boolean(),
  installmentAvailable: z.boolean(),
  media: z.array(ListingMediaSchema),
  viewCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  publishedAt: z.string().datetime(),
  soldAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ListingDetail = z.infer<typeof ListingDetailSchema>;

// ── ListingDraft payload (partial, any subset of step fields) ──

export const DraftPhotoSchema = z.object({
  photoId: z.string().uuid(),
  key: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
});
export type DraftPhoto = z.infer<typeof DraftPhotoSchema>;

export const ListingDraftPayloadSchema = z.object({
  currentStep: z.number().int().min(1).max(7).optional(),
  vin: z.string().optional(),
  photos: z.array(DraftPhotoSchema).optional(),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  generationId: z.string().uuid().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  mileageKm: z.number().int().nonnegative().optional(),
  condition: ListingConditionSchema.optional(),
  colorId: z.string().uuid().optional(),
  bodyTypeId: z.string().uuid().optional(),
  transmissionId: z.string().uuid().optional(),
  driveTypeId: z.string().uuid().optional(),
  engineTypeId: z.string().uuid().optional(),
  enginePower: z.number().int().positive().optional(),
  priceAmount: z.number().positive().optional(),
  priceCurrency: CurrencySchema.optional(),
  regionId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  locationText: z.string().optional(),
  description: z.string().max(2000).optional(),
  contactPhone: z.string().optional(),
  allowCalls: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  acceptsExchange: z.boolean().optional(),
  installmentAvailable: z.boolean().optional(),
  validatedSteps: z.array(z.string()).optional(),
});
export type ListingDraftPayload = z.infer<typeof ListingDraftPayloadSchema>;

// ── ListingDraft entity ──

export const ListingDraftSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  payload: ListingDraftPayloadSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ListingDraft = z.infer<typeof ListingDraftSchema>;

// ── Request schemas ──

export const CreateDraftRequestSchema = z
  .object({
    initialPayload: ListingDraftPayloadSchema.optional(),
  })
  .optional();
export type CreateDraftRequest = z.infer<typeof CreateDraftRequestSchema>;

export const UpdateDraftRequestSchema = ListingDraftPayloadSchema;
export type UpdateDraftRequest = z.infer<typeof UpdateDraftRequestSchema>;

export const PublishListingRequestSchema = z.object({});
export type PublishListingRequest = z.infer<typeof PublishListingRequestSchema>;

export const EditListingRequestSchema = z
  .object({
    priceAmount: z.number().positive().optional(),
    priceCurrency: CurrencySchema.optional(),
    description: z.string().max(2000).optional(),
    condition: ListingConditionSchema.optional(),
    mileageKm: z.number().int().nonnegative().optional(),
    colorId: z.string().uuid().optional(),
    bodyTypeId: z.string().uuid().optional(),
    transmissionId: z.string().uuid().optional(),
    driveTypeId: z.string().uuid().optional(),
    engineTypeId: z.string().uuid().optional(),
    enginePower: z.number().int().positive().optional(),
    regionId: z.string().uuid().optional(),
    cityId: z.string().uuid().optional(),
    locationText: z.string().optional(),
    contactPhone: z.string().optional(),
    allowCalls: z.boolean().optional(),
    allowChat: z.boolean().optional(),
    acceptsExchange: z.boolean().optional(),
    installmentAvailable: z.boolean().optional(),
  })
  .strict();
export type EditListingRequest = z.infer<typeof EditListingRequestSchema>;

export const MarkSoldRequestSchema = z.object({});
export type MarkSoldRequest = z.infer<typeof MarkSoldRequestSchema>;

export const ArchiveRequestSchema = z.object({});
export type ArchiveRequest = z.infer<typeof ArchiveRequestSchema>;

export const RepublishRequestSchema = z.object({});
export type RepublishRequest = z.infer<typeof RepublishRequestSchema>;

export const DeleteListingRequestSchema = z.object({});
export type DeleteListingRequest = z.infer<typeof DeleteListingRequestSchema>;

export const AttachMediaRequestSchema = z.object({
  key: z.string(),
  kind: z.enum(["image", "video"]),
  sortOrder: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
  posterKey: z.string().optional(),
});
export type AttachMediaRequest = z.infer<typeof AttachMediaRequestSchema>;

export const AttachMediaResponseSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  kind: z.enum(["image", "video"]),
  key: z.string(),
  sortOrder: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
  posterKey: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type AttachMediaResponse = z.infer<typeof AttachMediaResponseSchema>;

export const ReorderMediaRequestSchema = z.object({
  ordering: z.array(
    z.object({
      mediaId: z.string().uuid(),
      sortOrder: z.number().int().nonnegative(),
    }),
  ),
});
export type ReorderMediaRequest = z.infer<typeof ReorderMediaRequestSchema>;

export const ReorderMediaResponseSchema = z.object({
  success: z.boolean(),
});
export type ReorderMediaResponse = z.infer<typeof ReorderMediaResponseSchema>;

export const RemoveMediaResponseSchema = z.object({
  success: z.boolean(),
});
export type RemoveMediaResponse = z.infer<typeof RemoveMediaResponseSchema>;

// ── Cursor helpers ──

export const FeedCursorSchema = z.string();
export type FeedCursor = z.infer<typeof FeedCursorSchema>;

export function encodeCursor(cursor: {
  timestamp: string;
  id: string;
}): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(token: string): {
  timestamp: string;
  id: string;
} {
  const json = Buffer.from(token, "base64url").toString("utf8");
  return z
    .object({ timestamp: z.string(), id: z.string().uuid() })
    .parse(JSON.parse(json));
}

// ── Feed filters ──

export const ListingFilterSchema = z.object({
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  priceMin: z.coerce.number().positive().optional(),
  priceMax: z.coerce.number().positive().optional(),
  yearMin: z.coerce.number().int().min(1900).max(2100).optional(),
  yearMax: z.coerce.number().int().min(1900).max(2100).optional(),
  condition: ListingConditionSchema.optional(),
});
export type ListingFilter = z.infer<typeof ListingFilterSchema>;

// ── Feed query / response ──

export const FeedQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .merge(ListingFilterSchema);
export type FeedQuery = z.infer<typeof FeedQuerySchema>;

export const FeedResponseSchema = z.object({
  items: z.array(ListingSummarySchema),
  nextCursor: z.string().nullable(),
});
export type FeedResponse = z.infer<typeof FeedResponseSchema>;

// ── My listings / drafts responses ──

export const MyListingsResponseSchema = z.object({
  items: z.array(ListingSummarySchema),
  nextCursor: z.string().nullable(),
});
export type MyListingsResponse = z.infer<typeof MyListingsResponseSchema>;

export const MyDraftsResponseSchema = z.object({
  items: z.array(ListingDraftSchema),
  nextCursor: z.string().nullable(),
});
export type MyDraftsResponse = z.infer<typeof MyDraftsResponseSchema>;

// ── Favorite request / response ──

export const AddFavoriteResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  listingId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type AddFavoriteResponse = z.infer<typeof AddFavoriteResponseSchema>;

export const RemoveFavoriteResponseSchema = z.object({
  success: z.boolean(),
});
export type RemoveFavoriteResponse = z.infer<typeof RemoveFavoriteResponseSchema>;

export const MyFavoritesResponseSchema = z.object({
  items: z.array(ListingSummarySchema),
  nextCursor: z.string().nullable(),
});
export type MyFavoritesResponse = z.infer<typeof MyFavoritesResponseSchema>;

// ── Error codes ──

export const ListingsErrorCode = {
  ListingFieldLocked: "LISTING_FIELD_LOCKED",
  ExchangeRateMissing: "EXCHANGE_RATE_MISSING",
  ContactMethodRequired: "CONTACT_METHOD_REQUIRED",
  ListingDeleted: "LISTING_DELETED",
  ListingNotFound: "LISTING_NOT_FOUND",
  MediaLimitExceeded: "MEDIA_LIMIT_EXCEEDED",
} as const;
export type ListingsErrorCode =
  (typeof ListingsErrorCode)[keyof typeof ListingsErrorCode];
