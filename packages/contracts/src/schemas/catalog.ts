import { z } from "zod";

export const LocaleQuerySchema = z.object({
  locale: z.enum(["tk", "ru", "en"]).optional(),
});
export type LocaleQuery = z.infer<typeof LocaleQuerySchema>;

// ── Brand ──

export const BrandSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type BrandSummary = z.infer<typeof BrandSummarySchema>;

export const BrandDetailSchema = z.object({
  id: z.string().uuid(),
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
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  brandId: z.string().uuid(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type ModelSummary = z.infer<typeof ModelSummarySchema>;

export const ModelDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  brandId: z.string().uuid(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type ModelDetail = z.infer<typeof ModelDetailSchema>;

// ── Generation ──

export const GenerationSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  modelId: z.string().uuid(),
  yearStart: z.number().int().nullable().optional(),
  yearEnd: z.number().int().nullable().optional(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type GenerationSummary = z.infer<typeof GenerationSummarySchema>;

export const GenerationDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  modelId: z.string().uuid(),
  yearStart: z.number().int().nullable().optional(),
  yearEnd: z.number().int().nullable().optional(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type GenerationDetail = z.infer<typeof GenerationDetailSchema>;

// ── Color ──

export const ColorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  hex: z.string().nullable().optional(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type ColorSummary = z.infer<typeof ColorSummarySchema>;

export const ColorDetailSchema = z.object({
  id: z.string().uuid(),
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
  id: z.string().uuid(),
  name: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type BodyTypeSummary = z.infer<typeof BodyTypeSummarySchema>;

export const BodyTypeDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type BodyTypeDetail = z.infer<typeof BodyTypeDetailSchema>;

// ── Region ──

export const RegionSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type RegionSummary = z.infer<typeof RegionSummarySchema>;

export const RegionDetailSchema = z.object({
  id: z.string().uuid(),
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
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  regionId: z.string().uuid(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type CitySummary = z.infer<typeof CitySummarySchema>;

export const CityDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  nameRu: z.string(),
  nameTk: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  regionId: z.string().uuid(),
  localeFallback: z.enum(["ru", "tk", "en"]).optional(),
});
export type CityDetail = z.infer<typeof CityDetailSchema>;

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
