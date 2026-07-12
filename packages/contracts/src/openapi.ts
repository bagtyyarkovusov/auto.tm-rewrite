import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import { ErrorResponseSchema } from "./errors";
import { AdminTablePaginationRequestSchema } from "./pagination";
import {
  OtpRequestRequestSchema,
  OtpRequestResponseSchema,
  OtpVerifyRequestSchema,
  OtpVerifyResponseSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
  LogoutRequestSchema,
  AdminTotpStatusResponseSchema,
  AdminTotpEnrollResponseSchema,
  AdminTotpVerifyRequestSchema,
  AdminTotpVerifyResponseSchema,
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
  ListingCountQuerySchema,
  ListingCountResponseSchema,
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
  CreateReportRequestSchema,
  CreateReportResponseSchema,
  ReportListItemSchema,
  ListReportsResponseSchema,
  GetReportDetailResponseSchema,
  DismissReportRequestSchema,
  DismissReportResponseSchema,
  BanListingRequestSchema,
  BanListingResponseSchema,
  UnbanListingRequestSchema,
  UnbanListingResponseSchema,
  SuspendUserRequestSchema,
  SuspendUserResponseSchema,
  UnsuspendUserRequestSchema,
  UnsuspendUserResponseSchema,
  AuditLogListItemSchema,
  ListAuditEntriesResponseSchema,
} from "./schemas/admin";
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
import {
  CreateInspectionInterestRequestSchema,
  CreateInspectionInterestResponseSchema,
  InspectionInterestCountItemSchema,
  ListInspectionInterestStatsResponseSchema,
} from "./schemas/reports";

// exactOptionalPropertyTypes: true in tsconfig conflicts with zod-to-openapi's
// SchemaObject type (Zod nullable() method vs SchemaObject nullable: boolean).
const S = (schema: z.ZodTypeAny) => schema as unknown as Record<string, unknown>;

export function buildOpenApiRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  registry.register("ErrorResponse", ErrorResponseSchema);

  // Catalog read schemas
  registry.register("BrandSummary", BrandSummarySchema);
  registry.register("BrandDetail", BrandDetailSchema);
  registry.register("ModelSummary", ModelSummarySchema);
  registry.register("ModelDetail", ModelDetailSchema);
  registry.register("GenerationSummary", GenerationSummarySchema);
  registry.register("GenerationDetail", GenerationDetailSchema);
  registry.register("ColorSummary", ColorSummarySchema);
  registry.register("ColorDetail", ColorDetailSchema);
  registry.register("BodyTypeSummary", BodyTypeSummarySchema);
  registry.register("BodyTypeDetail", BodyTypeDetailSchema);
  registry.register("RegionSummary", RegionSummarySchema);
  registry.register("RegionDetail", RegionDetailSchema);
  registry.register("CitySummary", CitySummarySchema);
  registry.register("CityDetail", CityDetailSchema);

  // Catalog admin write schemas
  registry.register("CreateBrandRequest", CreateBrandRequestSchema);
  registry.register("UpdateBrandRequest", UpdateBrandRequestSchema);
  registry.register("DeleteBrandParam", DeleteBrandParamSchema);
  registry.register("CreateModelRequest", CreateModelRequestSchema);
  registry.register("UpdateModelRequest", UpdateModelRequestSchema);
  registry.register("DeleteModelParam", DeleteModelParamSchema);

  // Listings schemas
  registry.register("ListingSummary", ListingSummarySchema);
  registry.register("ListingDetail", ListingDetailSchema);
  registry.register("ListingMedia", ListingMediaSchema);
  registry.register("ListingDraft", ListingDraftSchema);
  registry.register("ListingDraftPayload", ListingDraftPayloadSchema);
  registry.register("CreateDraftRequest", CreateDraftRequestSchema);
  registry.register("UpdateDraftRequest", UpdateDraftRequestSchema);
  registry.register("PublishListingRequest", PublishListingRequestSchema);
  registry.register("EditListingRequest", EditListingRequestSchema);
  registry.register("AttachMediaRequest", AttachMediaRequestSchema);
  registry.register("ReorderMediaRequest", ReorderMediaRequestSchema);
  registry.register("FeedResponse", FeedResponseSchema);
  registry.register("ListingCountQuery", ListingCountQuerySchema);
  registry.register("ListingCountResponse", ListingCountResponseSchema);
  registry.register("MyListingsResponse", MyListingsResponseSchema);
  registry.register("MyDraftsResponse", MyDraftsResponseSchema);

  // Uploads schemas
  registry.register("PresignRequest", PresignRequestSchema);
  registry.register("PresignResponse", PresignResponseSchema);

  // Exchange-rates schemas
  registry.register("ExchangeRate", ExchangeRateSchema);
  registry.register("ExchangeRatesResponse", ExchangeRatesResponseSchema);

  // Conversation schemas
  registry.register("OpenConversationRequest", OpenConversationRequestSchema);
  registry.register("OpenConversationResponse", OpenConversationResponseSchema);
  registry.register("ListConversationsResponse", ListConversationsResponseSchema);
  registry.register("ListMessagesQuery", ListMessagesQuerySchema);
  registry.register("ListMessagesResponse", ListMessagesResponseSchema);
  registry.register("SendTextMessageRequest", SendTextMessageRequestSchema);
  registry.register("SendTextMessageResponse", SendTextMessageResponseSchema);
  registry.register("ConversationSummary", ConversationSummarySchema);
  registry.register("MessageSummary", MessageSummarySchema);
  registry.register("ConversationListingCard", ConversationListingCardSchema);

  // Admin TOTP schemas
  registry.register("AdminTotpStatusResponse", AdminTotpStatusResponseSchema);
  registry.register("AdminTotpEnrollResponse", AdminTotpEnrollResponseSchema);
  registry.register("AdminTotpVerifyRequest", AdminTotpVerifyRequestSchema);
  registry.register("AdminTotpVerifyResponse", AdminTotpVerifyResponseSchema);

  // Admin report schemas
  registry.register("CreateReportRequest", CreateReportRequestSchema);
  registry.register("CreateReportResponse", CreateReportResponseSchema);
  registry.register("ReportListItem", ReportListItemSchema);
  registry.register("ListReportsResponse", ListReportsResponseSchema);
  registry.register("GetReportDetailResponse", GetReportDetailResponseSchema);

  // Admin moderation schemas
  registry.register("DismissReportRequest", DismissReportRequestSchema);
  registry.register("DismissReportResponse", DismissReportResponseSchema);
  registry.register("BanListingRequest", BanListingRequestSchema);
  registry.register("BanListingResponse", BanListingResponseSchema);
  registry.register("UnbanListingRequest", UnbanListingRequestSchema);
  registry.register("UnbanListingResponse", UnbanListingResponseSchema);
  registry.register("SuspendUserRequest", SuspendUserRequestSchema);
  registry.register("SuspendUserResponse", SuspendUserResponseSchema);
  registry.register("UnsuspendUserRequest", UnsuspendUserRequestSchema);
  registry.register("UnsuspendUserResponse", UnsuspendUserResponseSchema);

  // Admin audit schemas
  registry.register("AuditLogListItem", AuditLogListItemSchema);
  registry.register("ListAuditEntriesResponse", ListAuditEntriesResponseSchema);

  // Reports fake-door schemas
  registry.register(
    "CreateInspectionInterestRequest",
    CreateInspectionInterestRequestSchema,
  );
  registry.register(
    "CreateInspectionInterestResponse",
    CreateInspectionInterestResponseSchema,
  );
  registry.register("InspectionInterestCountItem", InspectionInterestCountItemSchema);
  registry.register(
    "ListInspectionInterestStatsResponse",
    ListInspectionInterestStatsResponseSchema,
  );

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

  registry.registerPath({
    method: "post",
    path: "/api/v1/listings/{id}/inspection-interest",
    summary: "Register inspection interest (fake-door)",
    tags: ["Reports"],
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: {
        content: {
          "application/json": {
            schema: S(CreateInspectionInterestRequestSchema),
          },
        },
      },
    },
    responses: {
      201: {
        description: "Interest created",
        content: {
          "application/json": {
            schema: S(CreateInspectionInterestResponseSchema),
          },
        },
      },
      200: {
        description: "Existing interest returned",
        content: {
          "application/json": {
            schema: S(CreateInspectionInterestResponseSchema),
          },
        },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
      403: {
        description: "Feature disabled or user suspended",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
      404: {
        description: "Listing not found or ineligible",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/inspection-interests",
    summary: "List inspection interest statistics",
    tags: ["Admin", "Reports"],
    request: {
      query: AdminTablePaginationRequestSchema,
    },
    responses: {
      200: {
        description: "Interest statistics",
        content: {
          "application/json": {
            schema: S(ListInspectionInterestStatsResponseSchema),
          },
        },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/listings/count",
    summary: "Count listings matching public feed filters",
    tags: ["Listings"],
    request: {
      query: ListingCountQuerySchema,
    },
    responses: {
      200: {
        description: "Total matching listings",
        content: {
          "application/json": { schema: S(ListingCountResponseSchema) },
        },
      },
      400: {
        description: "Validation error",
        content: { "application/json": { schema: S(ErrorResponseSchema) } },
      },
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
