import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import type { z } from "zod";

import { ErrorResponseSchema } from "./errors";
import {
  OtpRequestRequestSchema,
  OtpRequestResponseSchema,
  OtpVerifyRequestSchema,
  OtpVerifyResponseSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
  LogoutRequestSchema,
} from "./schemas/auth";
import {
  BrandSummarySchema,
  BrandDetailSchema,
  ModelSummarySchema,
  ModelDetailSchema,
  GenerationSummarySchema,
  GenerationDetailSchema,
  ColorSummarySchema,
  ColorDetailSchema,
  BodyTypeSummarySchema,
  BodyTypeDetailSchema,
  RegionSummarySchema,
  RegionDetailSchema,
  CitySummarySchema,
  CityDetailSchema,
  CreateBrandRequestSchema,
  UpdateBrandRequestSchema,
  DeleteBrandParamSchema,
  CreateModelRequestSchema,
  UpdateModelRequestSchema,
  DeleteModelParamSchema,
} from "./schemas/catalog";
import {
  ListingSummarySchema,
  ListingDetailSchema,
  ListingMediaSchema,
  ListingDraftSchema,
  ListingDraftPayloadSchema,
  CreateDraftRequestSchema,
  UpdateDraftRequestSchema,
  PublishListingRequestSchema,
  EditListingRequestSchema,
  AttachMediaRequestSchema,
  ReorderMediaRequestSchema,
  FeedResponseSchema,
  MyListingsResponseSchema,
  MyDraftsResponseSchema,
} from "./schemas/listings";
import {
  PresignRequestSchema,
  PresignResponseSchema,
} from "./schemas/uploads";
import {
  ExchangeRateSchema,
  ExchangeRatesResponseSchema,
} from "./schemas/exchange-rates";

// exactOptionalPropertyTypes: true in tsconfig conflicts with zod-to-openapi's
// SchemaObject type (Zod nullable() method vs SchemaObject nullable: boolean).
const S = (schema: z.ZodTypeAny) => schema as unknown as Record<string, unknown>;

export function buildOpenApiRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  registry.registerComponent("schemas", "ErrorResponse", S(ErrorResponseSchema));

  // Catalog read schemas
  registry.registerComponent("schemas", "BrandSummary", S(BrandSummarySchema));
  registry.registerComponent("schemas", "BrandDetail", S(BrandDetailSchema));
  registry.registerComponent("schemas", "ModelSummary", S(ModelSummarySchema));
  registry.registerComponent("schemas", "ModelDetail", S(ModelDetailSchema));
  registry.registerComponent("schemas", "GenerationSummary", S(GenerationSummarySchema));
  registry.registerComponent("schemas", "GenerationDetail", S(GenerationDetailSchema));
  registry.registerComponent("schemas", "ColorSummary", S(ColorSummarySchema));
  registry.registerComponent("schemas", "ColorDetail", S(ColorDetailSchema));
  registry.registerComponent("schemas", "BodyTypeSummary", S(BodyTypeSummarySchema));
  registry.registerComponent("schemas", "BodyTypeDetail", S(BodyTypeDetailSchema));
  registry.registerComponent("schemas", "RegionSummary", S(RegionSummarySchema));
  registry.registerComponent("schemas", "RegionDetail", S(RegionDetailSchema));
  registry.registerComponent("schemas", "CitySummary", S(CitySummarySchema));
  registry.registerComponent("schemas", "CityDetail", S(CityDetailSchema));

  // Catalog admin write schemas
  registry.registerComponent("schemas", "CreateBrandRequest", S(CreateBrandRequestSchema));
  registry.registerComponent("schemas", "UpdateBrandRequest", S(UpdateBrandRequestSchema));
  registry.registerComponent("schemas", "DeleteBrandParam", S(DeleteBrandParamSchema));
  registry.registerComponent("schemas", "CreateModelRequest", S(CreateModelRequestSchema));
  registry.registerComponent("schemas", "UpdateModelRequest", S(UpdateModelRequestSchema));
  registry.registerComponent("schemas", "DeleteModelParam", S(DeleteModelParamSchema));

  // Listings schemas
  registry.registerComponent("schemas", "ListingSummary", S(ListingSummarySchema));
  registry.registerComponent("schemas", "ListingDetail", S(ListingDetailSchema));
  registry.registerComponent("schemas", "ListingMedia", S(ListingMediaSchema));
  registry.registerComponent("schemas", "ListingDraft", S(ListingDraftSchema));
  registry.registerComponent("schemas", "ListingDraftPayload", S(ListingDraftPayloadSchema));
  registry.registerComponent("schemas", "CreateDraftRequest", S(CreateDraftRequestSchema));
  registry.registerComponent("schemas", "UpdateDraftRequest", S(UpdateDraftRequestSchema));
  registry.registerComponent("schemas", "PublishListingRequest", S(PublishListingRequestSchema));
  registry.registerComponent("schemas", "EditListingRequest", S(EditListingRequestSchema));
  registry.registerComponent("schemas", "AttachMediaRequest", S(AttachMediaRequestSchema));
  registry.registerComponent("schemas", "ReorderMediaRequest", S(ReorderMediaRequestSchema));
  registry.registerComponent("schemas", "FeedResponse", S(FeedResponseSchema));
  registry.registerComponent("schemas", "MyListingsResponse", S(MyListingsResponseSchema));
  registry.registerComponent("schemas", "MyDraftsResponse", S(MyDraftsResponseSchema));

  // Uploads schemas
  registry.registerComponent("schemas", "PresignRequest", S(PresignRequestSchema));
  registry.registerComponent("schemas", "PresignResponse", S(PresignResponseSchema));

  // Exchange-rates schemas
  registry.registerComponent("schemas", "ExchangeRate", S(ExchangeRateSchema));
  registry.registerComponent("schemas", "ExchangeRatesResponse", S(ExchangeRatesResponseSchema));

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/otp/request",
    summary: "Request OTP",
    tags: ["Auth"],
    request: {
      body: { content: { "application/json": { schema: S(OtpRequestRequestSchema) } } },
    },
    responses: {
      200: {
        description: "OTP sent",
        content: {
          "application/json": { schema: S(OtpRequestResponseSchema) },
        },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/otp/verify",
    summary: "Verify OTP",
    tags: ["Auth"],
    request: {
      body: { content: { "application/json": { schema: S(OtpVerifyRequestSchema) } } },
    },
    responses: {
      200: {
        description: "OTP verified, tokens issued",
        content: {
          "application/json": { schema: S(OtpVerifyResponseSchema) },
        },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/refresh",
    summary: "Refresh tokens",
    tags: ["Auth"],
    request: {
      body: { content: { "application/json": { schema: S(RefreshRequestSchema) } } },
    },
    responses: {
      200: {
        description: "Tokens refreshed",
        content: {
          "application/json": { schema: S(RefreshResponseSchema) },
        },
      },
      401: {
        description: "Invalid or expired refresh token",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/logout",
    summary: "Logout",
    tags: ["Auth"],
    request: {
      body: { content: { "application/json": { schema: S(LogoutRequestSchema) } } },
    },
    responses: {
      200: { description: "Logged out" },
    },
  });

  return registry;
}

export function generateOpenApiDocument(): object {
  const registry = buildOpenApiRegistry();
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "AutoTM API",
      version: "0.1.0",
      description: "AutoTM Marketplace API — Phase 1",
    },
    servers: [{ url: "https://api.auto.tm" }],
  });
}
