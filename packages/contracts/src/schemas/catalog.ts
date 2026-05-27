import { z } from "zod";

export const LocaleQuerySchema = z.object({
  locale: z.enum(["tk", "ru", "en"]).optional(),
});
export type LocaleQuery = z.infer<typeof LocaleQuerySchema>;

// ── Brand ──

export const BrandSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type BrandSummary = z.infer<typeof BrandSummarySchema>;

export const BrandDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type BrandDetail = z.infer<typeof BrandDetailSchema>;

// ── Model ──

export const ModelSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  brandId: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type ModelSummary = z.infer<typeof ModelSummarySchema>;

export const ModelDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  brandId: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type ModelDetail = z.infer<typeof ModelDetailSchema>;

// ── Generation ──

export const GenerationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  modelId: z.string(),
  yearStart: z.number().int().nullable().optional(),
  yearEnd: z.number().int().nullable().optional(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type GenerationSummary = z.infer<typeof GenerationSummarySchema>;

export const GenerationDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  modelId: z.string(),
  yearStart: z.number().int().nullable().optional(),
  yearEnd: z.number().int().nullable().optional(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type GenerationDetail = z.infer<typeof GenerationDetailSchema>;

// ── Color ──

export const ColorSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  hex: z.string().nullable().optional(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type ColorSummary = z.infer<typeof ColorSummarySchema>;

export const ColorDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  hex: z.string().nullable().optional(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type ColorDetail = z.infer<typeof ColorDetailSchema>;

// ── BodyType ──

export const BodyTypeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type BodyTypeSummary = z.infer<typeof BodyTypeSummarySchema>;

export const BodyTypeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type BodyTypeDetail = z.infer<typeof BodyTypeDetailSchema>;

// ── EngineType ──

export const EngineTypeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type EngineTypeSummary = z.infer<typeof EngineTypeSummarySchema>;

export const EngineTypeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type EngineTypeDetail = z.infer<typeof EngineTypeDetailSchema>;

// ── Transmission ──

export const TransmissionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type TransmissionSummary = z.infer<typeof TransmissionSummarySchema>;

export const TransmissionDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type TransmissionDetail = z.infer<typeof TransmissionDetailSchema>;

// ── DriveType ──

export const DriveTypeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type DriveTypeSummary = z.infer<typeof DriveTypeSummarySchema>;

export const DriveTypeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type DriveTypeDetail = z.infer<typeof DriveTypeDetailSchema>;

// ── Region ──

export const RegionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type RegionSummary = z.infer<typeof RegionSummarySchema>;

export const RegionDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type RegionDetail = z.infer<typeof RegionDetailSchema>;

// ── City ──

export const CitySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  regionId: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type CitySummary = z.infer<typeof CitySummarySchema>;

export const CityDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  regionId: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type CityDetail = z.infer<typeof CityDetailSchema>;

// ── List Response Schemas ──

export const BrandSummaryListResponseSchema = z.object({
  items: z.array(BrandSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type BrandSummaryListResponse = z.infer<
  typeof BrandSummaryListResponseSchema
>;

// ── Admin Write DTOs (Brand + Model only) ──

export const CreateBrandRequestSchema = z.object({
  nameRu: z.string().min(1),
  nameTk: z.string().min(1),
  nameEn: z.string().min(1),
  slug: z.string().min(1),
});
export type CreateBrandRequest = z.infer<typeof CreateBrandRequestSchema>;

export const UpdateBrandRequestSchema = CreateBrandRequestSchema.partial();
export type UpdateBrandRequest = z.infer<typeof UpdateBrandRequestSchema>;

export const DeleteBrandParamSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteBrandParam = z.infer<typeof DeleteBrandParamSchema>;

export const CreateModelRequestSchema = z.object({
  nameRu: z.string().min(1),
  nameTk: z.string().min(1),
  nameEn: z.string().min(1),
  slug: z.string().min(1),
  brandId: z.string().uuid(),
});
export type CreateModelRequest = z.infer<typeof CreateModelRequestSchema>;

export const UpdateModelRequestSchema = CreateModelRequestSchema.partial();
export type UpdateModelRequest = z.infer<typeof UpdateModelRequestSchema>;

export const DeleteModelParamSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteModelParam = z.infer<typeof DeleteModelParamSchema>;
