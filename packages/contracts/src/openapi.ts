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
