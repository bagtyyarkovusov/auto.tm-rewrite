import { describe, it, expect } from "vitest";

import {
  OtpRequestRequestSchema,
  OtpVerifyRequestSchema,
} from "../src/schemas/auth";
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

describe("OpenAPI document", () => {
  it("contains auth OTP request and verify paths", () => {
    const doc = generateOpenApiDocument() as {
      paths: Record<string, unknown>;
    };
    expect(doc.paths).toHaveProperty("/api/v1/auth/otp/request");
    expect(doc.paths).toHaveProperty("/api/v1/auth/otp/verify");
  });
});
