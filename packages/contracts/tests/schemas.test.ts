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
  ListingFilterSchema,
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
import {
  OpenConversationRequestSchema,
  SendTextMessageRequestSchema,
  ConversationSummarySchema,
  MessageSummarySchema,
  ConversationListingCardSchema,
  ListMessagesQuerySchema,
  ListConversationsQuerySchema,
  ListMessagesResponseSchema,
  ListConversationsResponseSchema,
} from "../src/schemas/conversations";
import { generateOpenApiDocument } from "../src/openapi";
import {
  WizardStepSchema,
  validateStep,
  getStepDependencies,
  getInvalidatedSteps,
  StepVinSchema,
  StepPhotosSchema,
  StepVehicleSchema,
  StepSpecsSchema,
  StepPriceSchema,
  StepLocationSchema,
  StepContactSchema,
  ValidateStepRequestSchema,
  ValidateStepResponseSchema,
} from "../src/schemas/wizard";

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
      acceptsExchange: false,
      installmentAvailable: false,
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

  it("accepts validatedSteps in payload", () => {
    const result = ListingDraftPayloadSchema.safeParse({
      vin: "WBA123",
      validatedSteps: ["vin", "photos"],
    });
    expect(result.success).toBe(true);
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

  it("accepts query with filter fields", () => {
    const result = FeedQuerySchema.safeParse({
      cursor: "abc123",
      limit: 10,
      brandId: "550e8400-e29b-41d4-a716-446655440002",
      priceMin: 50000,
      yearMin: 2018,
      condition: "used",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brandId).toBe("550e8400-e29b-41d4-a716-446655440002");
      expect(result.data.priceMin).toBe(50000);
      expect(result.data.yearMin).toBe(2018);
      expect(result.data.condition).toBe("used");
    }
  });

  it("coerces string query values to numbers", () => {
    const result = FeedQuerySchema.safeParse({
      priceMin: "150000",
      priceMax: "300000",
      yearMin: "2015",
      yearMax: "2022",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceMin).toBe(150000);
      expect(result.data.priceMax).toBe(300000);
      expect(result.data.yearMin).toBe(2015);
      expect(result.data.yearMax).toBe(2022);
    }
  });

  it("rejects negative priceMin", () => {
    const result = FeedQuerySchema.safeParse({ priceMin: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects yearMin below 1900", () => {
    const result = FeedQuerySchema.safeParse({ yearMin: 1899 });
    expect(result.success).toBe(false);
  });

  it("rejects yearMax above 2100", () => {
    const result = FeedQuerySchema.safeParse({ yearMax: 2101 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid condition", () => {
    const result = FeedQuerySchema.safeParse({ condition: "broken" });
    expect(result.success).toBe(false);
  });
});

describe("ListingFilterSchema", () => {
  it("accepts empty filter", () => {
    const result = ListingFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial filter", () => {
    const result = ListingFilterSchema.safeParse({
      brandId: "550e8400-e29b-41d4-a716-446655440002",
      priceMin: 100000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts full filter", () => {
    const result = ListingFilterSchema.safeParse({
      brandId: "550e8400-e29b-41d4-a716-446655440002",
      modelId: "550e8400-e29b-41d4-a716-446655440003",
      cityId: "550e8400-e29b-41d4-a716-446655440004",
      priceMin: 50000,
      priceMax: 200000,
      yearMin: 2010,
      yearMax: 2023,
      condition: "new",
    });
    expect(result.success).toBe(true);
  });

  it("coerces string numbers", () => {
    const result = ListingFilterSchema.safeParse({
      priceMin: "150000",
      yearMin: "2018",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceMin).toBe(150000);
      expect(result.data.yearMin).toBe(2018);
    }
  });

  it("rejects negative priceMin", () => {
    const result = ListingFilterSchema.safeParse({ priceMin: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects yearMin below 1900", () => {
    const result = ListingFilterSchema.safeParse({ yearMin: 1899 });
    expect(result.success).toBe(false);
  });

  it("rejects yearMax above 2100", () => {
    const result = ListingFilterSchema.safeParse({ yearMax: 2101 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid condition", () => {
    const result = ListingFilterSchema.safeParse({ condition: "repaired" });
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

// ── Wizard schemas ──

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const validPhoto = { photoId: validUuid, key: "uploads/abc.jpg", sortOrder: 0 };

describe("WizardStepSchema", () => {
  it("accepts valid steps", () => {
    expect(WizardStepSchema.safeParse("vin").success).toBe(true);
    expect(WizardStepSchema.safeParse("photos").success).toBe(true);
    expect(WizardStepSchema.safeParse("contact").success).toBe(true);
    expect(WizardStepSchema.safeParse("review").success).toBe(true);
  });

  it("rejects invalid step", () => {
    expect(WizardStepSchema.safeParse("publish").success).toBe(false);
    expect(WizardStepSchema.safeParse("unknown").success).toBe(false);
  });
});

describe("StepVinSchema", () => {
  it("accepts empty payload", () => {
    expect(StepVinSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid VIN", () => {
    expect(StepVinSchema.safeParse({ vin: "WBA1234567890ABCD" }).success).toBe(
      true,
    );
  });

  it("rejects VIN over 17 chars", () => {
    expect(StepVinSchema.safeParse({ vin: "A".repeat(18) }).success).toBe(
      false,
    );
  });
});

describe("StepPhotosSchema", () => {
  it("accepts photos with at least one key", () => {
    expect(StepPhotosSchema.safeParse({ photos: [validPhoto] }).success).toBe(
      true,
    );
  });

  it("rejects empty photos array", () => {
    expect(StepPhotosSchema.safeParse({ photos: [] }).success).toBe(false);
  });

  it("rejects photos with no uploaded keys", () => {
    expect(
      StepPhotosSchema.safeParse({ photos: [{ photoId: validUuid, sortOrder: 0 }] }).success,
    ).toBe(false);
  });
});

describe("StepVehicleSchema", () => {
  it("accepts valid vehicle data", () => {
    expect(
      StepVehicleSchema.safeParse({
        brandId: validUuid,
        modelId: validUuid,
        year: 2020,
      }).success,
    ).toBe(true);
  });

  it("rejects missing brandId", () => {
    expect(
      StepVehicleSchema.safeParse({ modelId: validUuid, year: 2020 }).success,
    ).toBe(false);
  });

  it("rejects year below 1900", () => {
    expect(
      StepVehicleSchema.safeParse({
        brandId: validUuid,
        modelId: validUuid,
        year: 1899,
      }).success,
    ).toBe(false);
  });

  it("rejects year too far in future", () => {
    expect(
      StepVehicleSchema.safeParse({
        brandId: validUuid,
        modelId: validUuid,
        year: new Date().getFullYear() + 2,
      }).success,
    ).toBe(false);
  });
});

describe("StepSpecsSchema", () => {
  it("accepts new vehicle without mileage", () => {
    expect(
      StepSpecsSchema.safeParse({ condition: "new" }).success,
    ).toBe(true);
  });

  it("rejects used vehicle without mileage", () => {
    expect(
      StepSpecsSchema.safeParse({ condition: "used" }).success,
    ).toBe(false);
  });

  it("accepts used vehicle with mileage", () => {
    expect(
      StepSpecsSchema.safeParse({ condition: "used", mileageKm: 50000 }).success,
    ).toBe(true);
  });

  it("rejects negative mileage", () => {
    expect(
      StepSpecsSchema.safeParse({
        condition: "used",
        mileageKm: -1,
      }).success,
    ).toBe(false);
  });
});

describe("StepPriceSchema", () => {
  it("accepts valid TMT price", () => {
    expect(
      StepPriceSchema.safeParse({ priceAmount: 100000, priceCurrency: "TMT" })
        .success,
    ).toBe(true);
  });

  it("rejects zero price", () => {
    expect(
      StepPriceSchema.safeParse({ priceAmount: 0, priceCurrency: "TMT" })
        .success,
    ).toBe(false);
  });

  it("rejects price over max", () => {
    expect(
      StepPriceSchema.safeParse({
        priceAmount: 1_000_000_000,
        priceCurrency: "TMT",
      }).success,
    ).toBe(false);
  });
});

describe("StepLocationSchema", () => {
  it("accepts valid location", () => {
    expect(
      StepLocationSchema.safeParse({
        regionId: validUuid,
        cityId: validUuid,
      }).success,
    ).toBe(true);
  });

  it("rejects missing regionId", () => {
    expect(
      StepLocationSchema.safeParse({ cityId: validUuid }).success,
    ).toBe(false);
  });

  it("rejects location text over 200 chars", () => {
    expect(
      StepLocationSchema.safeParse({
        regionId: validUuid,
        cityId: validUuid,
        locationText: "a".repeat(201),
      }).success,
    ).toBe(false);
  });
});

describe("StepContactSchema", () => {
  it("accepts valid contact with both methods", () => {
    expect(
      StepContactSchema.safeParse({
        description: "Great car",
        allowCalls: true,
        allowChat: true,
      }).success,
    ).toBe(true);
  });

  it("accepts valid contact with one method", () => {
    expect(
      StepContactSchema.safeParse({
        description: "Great car",
        allowCalls: false,
        allowChat: true,
      }).success,
    ).toBe(true);
  });

  it("rejects empty description", () => {
    expect(
      StepContactSchema.safeParse({
        description: "",
        allowCalls: true,
        allowChat: true,
      }).success,
    ).toBe(false);
  });

  it("rejects description over 2000 chars", () => {
    expect(
      StepContactSchema.safeParse({
        description: "a".repeat(2001),
        allowCalls: true,
        allowChat: true,
      }).success,
    ).toBe(false);
  });

  it("rejects when both contact methods disabled", () => {
    expect(
      StepContactSchema.safeParse({
        description: "Great car",
        allowCalls: false,
        allowChat: false,
      }).success,
    ).toBe(false);
  });
});

describe("validateStep", () => {
  it("returns valid for complete vehicle step", () => {
    const result = validateStep("vehicle", {
      brandId: validUuid,
      modelId: validUuid,
      year: 2020,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns errors for incomplete vehicle step", () => {
    const result = validateStep("vehicle", { brandId: validUuid });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns errors for used vehicle without mileage", () => {
    const result = validateStep("specs", { condition: "used" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Mileage is required for used cars");
    expect(result.fieldErrors["mileageKm"]).toBe(
      "Mileage is required for used cars",
    );
  });

  it("returns valid for photos with uploaded key", () => {
    const result = validateStep("photos", { photos: [validPhoto] });
    expect(result.valid).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });

  it("returns errors for photos without key", () => {
    const result = validateStep("photos", {
      photos: [{ photoId: validUuid, sortOrder: 0 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Wait for photos to finish uploading");
  });

  it("returns per-field error map for vehicle step", () => {
    const result = validateStep("vehicle", {});
    expect(result.valid).toBe(false);
    expect(result.fieldErrors["brandId"]).toBe("Brand is required");
    expect(result.fieldErrors["modelId"]).toBe("Model is required");
    expect(result.fieldErrors["year"]).toBe("Year is required");
  });

  it("returns valid for review when invoked directly", () => {
    const result = validateStep("review", {});
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("getStepDependencies", () => {
  it("vin has no dependencies", () => {
    expect(getStepDependencies("vin")).toEqual([]);
  });

  it("vehicle depends on vin and photos", () => {
    expect(getStepDependencies("vehicle")).toEqual(["vin", "photos"]);
  });

  it("contact depends on all previous steps", () => {
    expect(getStepDependencies("contact")).toEqual([
      "vin",
      "photos",
      "vehicle",
      "specs",
      "price",
      "location",
    ]);
  });
});

describe("getInvalidatedSteps", () => {
  it("changing brandId invalidates vehicle and downstream", () => {
    const result = getInvalidatedSteps(["brandId"]);
    expect(result).toEqual([
      "vehicle",
      "specs",
      "price",
      "location",
      "contact",
      "review",
    ]);
  });

  it("changing condition invalidates specs and downstream", () => {
    const result = getInvalidatedSteps(["condition"]);
    expect(result).toEqual([
      "specs",
      "price",
      "location",
      "contact",
      "review",
    ]);
  });

  it("changing multiple fields invalidates union of affected steps", () => {
    const result = getInvalidatedSteps(["brandId", "priceAmount"]);
    expect(result).toEqual([
      "vehicle",
      "specs",
      "price",
      "location",
      "contact",
      "review",
    ]);
  });

  it("changing description only invalidates contact and review", () => {
    const result = getInvalidatedSteps(["description"]);
    expect(result).toEqual(["contact", "review"]);
  });

  it("unknown fields are ignored", () => {
    const result = getInvalidatedSteps(["unknownField"]);
    expect(result).toEqual([]);
  });
});

describe("ValidateStepRequestSchema", () => {
  it("accepts valid request", () => {
    const result = ValidateStepRequestSchema.safeParse({
      step: "vehicle",
      payload: { brandId: validUuid, modelId: validUuid, year: 2020 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid step", () => {
    const result = ValidateStepRequestSchema.safeParse({
      step: "publish",
      payload: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("ValidateStepResponseSchema", () => {
  it("accepts valid response", () => {
    const result = ValidateStepResponseSchema.safeParse({
      valid: true,
      errors: [],
      invalidatedSteps: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts response with errors", () => {
    const result = ValidateStepResponseSchema.safeParse({
      valid: false,
      errors: ["Missing brandId"],
      invalidatedSteps: ["vehicle"],
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

  it("contains conversation schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("OpenConversationRequest");
    expect(doc.components.schemas).toHaveProperty("OpenConversationResponse");
    expect(doc.components.schemas).toHaveProperty("ConversationSummary");
    expect(doc.components.schemas).toHaveProperty("MessageSummary");
    expect(doc.components.schemas).toHaveProperty("ConversationListingCard");
    expect(doc.components.schemas).toHaveProperty("ListConversationsResponse");
    expect(doc.components.schemas).toHaveProperty("ListMessagesResponse");
    expect(doc.components.schemas).toHaveProperty("SendTextMessageRequest");
    expect(doc.components.schemas).toHaveProperty("SendTextMessageResponse");
  });

  it("contains conversation paths", () => {
    const doc = generateOpenApiDocument() as {
      paths: Record<string, unknown>;
    };
    expect(doc.paths).toHaveProperty("/api/v1/conversations");
    expect(doc.paths).toHaveProperty("/api/v1/conversations/{id}/messages");
  });
});

// ── Conversation schemas ──

const validConversationListingCard = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  brandId: "550e8400-e29b-41d4-a716-446655440001",
  modelId: "550e8400-e29b-41d4-a716-446655440002",
  year: 2020,
  displayPriceTmt: 1890000,
  priceCurrency: "TMT" as const,
  coverMediaKey: "listings/abc/123/cover.jpg",
  status: "active" as const,
};

const validMessageSummary = {
  id: "550e8400-e29b-41d4-a716-446655440003",
  conversationId: "550e8400-e29b-41d4-a716-446655440004",
  senderId: "550e8400-e29b-41d4-a716-446655440005",
  text: "Is it still available?",
  createdAt: "2026-05-17T14:32:01Z",
};

const validConversationSummary = {
  id: "550e8400-e29b-41d4-a716-446655440004",
  listing: validConversationListingCard,
  buyerId: "550e8400-e29b-41d4-a716-446655440005",
  sellerId: "550e8400-e29b-41d4-a716-446655440006",
  myRole: "buyer" as const,
  lastMessage: validMessageSummary,
  updatedAt: "2026-05-17T14:32:01Z",
};

describe("ConversationListingCardSchema", () => {
  it("accepts a valid listing card", () => {
    const result = ConversationListingCardSchema.safeParse(
      validConversationListingCard,
    );
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = ConversationListingCardSchema.safeParse({
      ...validConversationListingCard,
      status: "banned",
    });
    expect(result.success).toBe(false);
  });
});

describe("MessageSummarySchema", () => {
  it("accepts a valid message summary", () => {
    const result = MessageSummarySchema.safeParse(validMessageSummary);
    expect(result.success).toBe(true);
  });

  it("accepts a message with optional deliveryStatus", () => {
    const result = MessageSummarySchema.safeParse({
      ...validMessageSummary,
      deliveryStatus: "sent" as const,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid datetime", () => {
    const result = MessageSummarySchema.safeParse({
      ...validMessageSummary,
      createdAt: "not-a-datetime",
    });
    expect(result.success).toBe(false);
  });
});

describe("ConversationSummarySchema", () => {
  it("accepts a valid conversation summary", () => {
    const result = ConversationSummarySchema.safeParse(validConversationSummary);
    expect(result.success).toBe(true);
  });

  it("accepts without lastMessage", () => {
    const result = ConversationSummarySchema.safeParse({
      ...validConversationSummary,
      lastMessage: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe("OpenConversationRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = OpenConversationRequestSchema.safeParse({
      listingId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid listingId", () => {
    const result = OpenConversationRequestSchema.safeParse({
      listingId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("SendTextMessageRequestSchema", () => {
  it("accepts a valid text message", () => {
    const result = SendTextMessageRequestSchema.safeParse({
      text: "Hello, is it still available?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty text", () => {
    const result = SendTextMessageRequestSchema.safeParse({
      text: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects text over 1000 chars", () => {
    const result = SendTextMessageRequestSchema.safeParse({
      text: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("ListMessagesResponseSchema", () => {
  it("accepts a valid paginated response", () => {
    const result = ListMessagesResponseSchema.safeParse({
      items: [validMessageSummary],
      nextCursor: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a response with a cursor", () => {
    const result = ListMessagesResponseSchema.safeParse({
      items: [validMessageSummary],
      nextCursor: "next-page-token",
    });
    expect(result.success).toBe(true);
  });
});

describe("ListMessagesQuerySchema", () => {
  it("accepts a valid query with defaults", () => {
    const result = ListMessagesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ limit: 20 });
  });

  it("accepts cursor and limit", () => {
    const result = ListMessagesQuerySchema.safeParse({
      cursor: "next-page",
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects limit over 50", () => {
    const result = ListMessagesQuerySchema.safeParse({ limit: 51 });
    expect(result.success).toBe(false);
  });
});

describe("ListConversationsQuerySchema", () => {
  it("accepts a valid query with defaults", () => {
    const result = ListConversationsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ limit: 20 });
  });

  it("accepts cursor and limit", () => {
    const result = ListConversationsQuerySchema.safeParse({
      cursor: "next-page",
      limit: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe("ListConversationsResponseSchema", () => {
  it("accepts a valid paginated response", () => {
    const result = ListConversationsResponseSchema.safeParse({
      items: [validConversationSummary],
      nextCursor: null,
    });
    expect(result.success).toBe(true);
  });
});
