import { describe, it, expect } from "vitest";

import {
  OtpRequestRequestSchema,
  OtpVerifyRequestSchema,
} from "../src/schemas/auth";
import {
  ListingSummarySchema,
  ListingDetailSchema,
  ListingMediaSchema,
  ListingDraftPayloadSchema,
  ListingDraftSchema,
  EditListingRequestSchema,
  FeedQuerySchema,
  FeedResponseSchema,
  encodeCursor,
  decodeCursor,
} from "../src/schemas/listings";
import {
  PresignRequestSchema,
  PresignResponseSchema,
} from "../src/schemas/uploads";
import {
  ExchangeRateSchema,
  ExchangeRatesResponseSchema,
} from "../src/schemas/exchange-rates";
import { generateOpenApiDocument } from "../src/openapi";

describe("OTP request schema", () => {
  it("accepts a valid TM mobile phone (+99362001122)", () => {
    const result = OtpRequestRequestSchema.safeParse({
      phone: "+99362001122",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-TM phone (+15551234567)", () => {
    const result = OtpRequestRequestSchema.safeParse({
      phone: "+15551234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a TM landline prefix (+99312001122)", () => {
    const result = OtpRequestRequestSchema.safeParse({
      phone: "+99312001122",
    });
    expect(result.success).toBe(false);
  });
});

describe("OTP verify schema", () => {
  it("accepts valid phone + 6-digit code", () => {
    const result = OtpVerifyRequestSchema.safeParse({
      phone: "+99365001122",
      code: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects 5-digit code", () => {
    const result = OtpVerifyRequestSchema.safeParse({
      phone: "+99365001122",
      code: "12345",
    });
    expect(result.success).toBe(false);
  });
});

// ── Listings schemas ──

const validListingSummary = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  sellerId: "550e8400-e29b-41d4-a716-446655440001",
  status: "active" as const,
  brandId: "550e8400-e29b-41d4-a716-446655440002",
  modelId: "550e8400-e29b-41d4-a716-446655440003",
  priceAmount: 1890000,
  priceCurrency: "TMT" as const,
  displayPriceTmt: 1890000,
  cityId: "550e8400-e29b-41d4-a716-446655440004",
  publishedAt: "2026-05-17T14:32:01Z",
};

describe("ListingSummarySchema", () => {
  it("accepts a valid summary", () => {
    const result = ListingSummarySchema.safeParse(validListingSummary);
    expect(result.success).toBe(true);
  });

  it("rejects negative priceAmount", () => {
    const result = ListingSummarySchema.safeParse({
      ...validListingSummary,
      priceAmount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = ListingSummarySchema.safeParse({
      ...validListingSummary,
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("ListingDetailSchema", () => {
  it("accepts a valid detail", () => {
    const result = ListingDetailSchema.safeParse({
      ...validListingSummary,
      media: [],
      allowCalls: true,
      allowChat: true,
      viewCount: 0,
      favoriteCount: 0,
      regionId: "550e8400-e29b-41d4-a716-446655440005",
      createdAt: "2026-05-17T14:32:01Z",
      updatedAt: "2026-05-17T14:32:01Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects description over 2000 chars", () => {
    const result = ListingDetailSchema.safeParse({
      ...validListingSummary,
      media: [],
      allowCalls: true,
      allowChat: true,
      viewCount: 0,
      favoriteCount: 0,
      regionId: "550e8400-e29b-41d4-a716-446655440005",
      createdAt: "2026-05-17T14:32:01Z",
      updatedAt: "2026-05-17T14:32:01Z",
      description: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("ListingMediaSchema", () => {
  it("accepts a valid image media", () => {
    const result = ListingMediaSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      kind: "image" as const,
      key: "listings/abc/123/original.jpg",
      variants: {
        thumbnail: "listings/abc/123/thumbnail.jpg",
        list: "listings/abc/123/list.jpg",
        detail: "listings/abc/123/detail.jpg",
        fullscreen: "listings/abc/123/fullscreen.jpg",
      },
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid video media with optional fields", () => {
    const result = ListingMediaSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      kind: "video" as const,
      key: "listings/abc/123/original.mp4",
      variants: {
        thumbnail: "listings/abc/123/thumbnail.jpg",
        list: "listings/abc/123/list.jpg",
        detail: "listings/abc/123/detail.jpg",
        fullscreen: "listings/abc/123/fullscreen.jpg",
      },
      sortOrder: 1,
      width: 1920,
      height: 1080,
      durationMs: 30000,
      posterKey: "listings/abc/123/poster.jpg",
    });
    expect(result.success).toBe(true);
  });
});

describe("ListingDraftPayloadSchema", () => {
  it("accepts a partial payload (any subset)", () => {
    const result = ListingDraftPayloadSchema.safeParse({
      currentStep: 3,
      brandId: "550e8400-e29b-41d4-a716-446655440002",
      modelId: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty payload", () => {
    const result = ListingDraftPayloadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects currentStep outside 1..7", () => {
    const result = ListingDraftPayloadSchema.safeParse({
      currentStep: 8,
    });
    expect(result.success).toBe(false);
  });
});

describe("ListingDraftSchema", () => {
  it("accepts a valid draft", () => {
    const result = ListingDraftSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      userId: "550e8400-e29b-41d4-a716-446655440001",
      payload: { currentStep: 2, photos: [] },
      createdAt: "2026-05-17T14:32:01Z",
      updatedAt: "2026-05-17T14:32:01Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("EditListingRequestSchema", () => {
  it("accepts valid editable fields", () => {
    const result = EditListingRequestSchema.safeParse({
      priceAmount: 2000000,
      priceCurrency: "USD",
      description: "Great car",
    });
    expect(result.success).toBe(true);
  });

  it("rejects locked fields via strict()", () => {
    const result = EditListingRequestSchema.safeParse({
      brandId: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields via strict()", () => {
    const result = EditListingRequestSchema.safeParse({
      unknownField: "value",
    });
    expect(result.success).toBe(false);
  });
});

describe("Feed cursor helpers", () => {
  it("encode + decode round-trips", () => {
    const cursor = {
      timestamp: "2026-05-17T14:32:01Z",
      id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const encoded = encodeCursor(cursor);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(cursor);
  });

  it("rejects malformed cursor on decode", () => {
    expect(() => decodeCursor("not-valid-base64")).toThrow();
  });
});

describe("FeedQuerySchema", () => {
  it("accepts valid query with defaults", () => {
    const result = FeedQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("rejects limit over 50", () => {
    const result = FeedQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(false);
  });
});

describe("FeedResponseSchema", () => {
  it("accepts a valid response", () => {
    const result = FeedResponseSchema.safeParse({
      items: [validListingSummary],
      nextCursor: null,
    });
    expect(result.success).toBe(true);
  });
});

// ── Uploads schemas ──

describe("PresignRequestSchema", () => {
  it("accepts a valid image presign request", () => {
    const result = PresignRequestSchema.safeParse({
      kind: "image",
      contentType: "image/jpeg",
      sizeBytes: 4_000_000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero sizeBytes", () => {
    const result = PresignRequestSchema.safeParse({
      kind: "video",
      contentType: "video/mp4",
      sizeBytes: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("PresignResponseSchema", () => {
  it("accepts a valid presign response", () => {
    const result = PresignResponseSchema.safeParse({
      uploadUrl: "https://minio.auto.tm/bucket/key?X-Amz-...",
      key: "uploads/abc/123.jpg",
      expiresIn: 300,
      maxSizeBytes: 5_242_880,
    });
    expect(result.success).toBe(true);
  });
});

// ── Exchange-rates schemas ──

describe("ExchangeRateSchema", () => {
  it("accepts a valid rate", () => {
    const result = ExchangeRateSchema.safeParse({
      fromCurrency: "USD",
      toCurrency: "TMT",
      rate: 3.5,
      updatedAt: "2026-05-17T14:32:01Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative rate", () => {
    const result = ExchangeRateSchema.safeParse({
      fromCurrency: "USD",
      toCurrency: "TMT",
      rate: -1,
      updatedAt: "2026-05-17T14:32:01Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("ExchangeRatesResponseSchema", () => {
  it("accepts a valid response", () => {
    const result = ExchangeRatesResponseSchema.safeParse({
      rates: [
        {
          fromCurrency: "USD",
          toCurrency: "TMT",
          rate: 3.5,
          updatedAt: "2026-05-17T14:32:01Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ── OpenAPI document ──

describe("OpenAPI document", () => {
  it("contains auth OTP request and verify paths", () => {
    const doc = generateOpenApiDocument() as {
      paths: Record<string, unknown>;
    };
    expect(doc.paths).toHaveProperty("/api/v1/auth/otp/request");
    expect(doc.paths).toHaveProperty("/api/v1/auth/otp/verify");
  });

  it("contains new listings schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("ListingSummary");
    expect(doc.components.schemas).toHaveProperty("ListingDetail");
    expect(doc.components.schemas).toHaveProperty("ListingMedia");
    expect(doc.components.schemas).toHaveProperty("ListingDraft");
    expect(doc.components.schemas).toHaveProperty("FeedResponse");
  });

  it("contains uploads and exchange-rates schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("PresignRequest");
    expect(doc.components.schemas).toHaveProperty("PresignResponse");
    expect(doc.components.schemas).toHaveProperty("ExchangeRate");
    expect(doc.components.schemas).toHaveProperty("ExchangeRatesResponse");
  });
});
