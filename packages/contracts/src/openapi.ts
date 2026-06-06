import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

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
import {
  OpenConversationRequestSchema,
  OpenConversationResponseSchema,
  ListConversationsResponseSchema,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  ListMessagesResponseSchema,
  SendTextMessageRequestSchema,
  SendTextMessageResponseSchema,
  ConversationSummarySchema,
  MessageSummarySchema,
  ConversationListingCardSchema,
} from "./schemas/conversations";

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

  // Conversation schemas
  registry.registerComponent("schemas", "OpenConversationRequest", S(OpenConversationRequestSchema));
  registry.registerComponent("schemas", "OpenConversationResponse", S(OpenConversationResponseSchema));
  registry.registerComponent("schemas", "ListConversationsResponse", S(ListConversationsResponseSchema));
  registry.registerComponent("schemas", "ListMessagesQuery", S(ListMessagesQuerySchema));
  registry.registerComponent("schemas", "ListMessagesResponse", S(ListMessagesResponseSchema));
  registry.registerComponent("schemas", "SendTextMessageRequest", S(SendTextMessageRequestSchema));
  registry.registerComponent("schemas", "SendTextMessageResponse", S(SendTextMessageResponseSchema));
  registry.registerComponent("schemas", "ConversationSummary", S(ConversationSummarySchema));
  registry.registerComponent("schemas", "MessageSummary", S(MessageSummarySchema));
  registry.registerComponent("schemas", "ConversationListingCard", S(ConversationListingCardSchema));

  registry.registerPath({
    method: "post",
    path: "/api/v1/conversations",
    summary: "Open or create a conversation",
    tags: ["Conversations"],
    request: {
      body: {
        content: {
          "application/json": { schema: S(OpenConversationRequestSchema) },
        },
      },
    },
    responses: {
      200: {
        description: "Conversation opened",
        content: {
          "application/json": { schema: S(OpenConversationResponseSchema) },
        },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
      403: {
        description: "Feature disabled or self-contact not allowed",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/conversations",
    summary: "List my conversations",
    tags: ["Conversations"],
    request: {
      query: ListConversationsQuerySchema,
    },
    responses: {
      200: {
        description: "Conversation list",
        content: {
          "application/json": { schema: S(ListConversationsResponseSchema) },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/conversations/{id}/messages",
    summary: "List messages in a conversation",
    tags: ["Conversations"],
    request: {
      params: z.object({ id: z.string().uuid() }),
      query: ListMessagesQuerySchema,
    },
    responses: {
      200: {
        description: "Message list",
        content: {
          "application/json": { schema: S(ListMessagesResponseSchema) },
        },
      },
      404: {
        description: "Conversation not found",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/conversations/{id}/messages",
    summary: "Send a text message",
    tags: ["Conversations"],
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: {
        content: {
          "application/json": { schema: S(SendTextMessageRequestSchema) },
        },
      },
    },
    responses: {
      200: {
        description: "Message sent",
        content: {
          "application/json": { schema: S(SendTextMessageResponseSchema) },
        },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
      403: {
        description: "Feature disabled or not a participant",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
      404: {
        description: "Conversation not found",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
    },
  });

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
