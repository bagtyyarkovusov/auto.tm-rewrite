import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { InvalidSignInCodeError } from "../domain/InvalidSignInCodeError";
import { SignInCodeRateLimitedError } from "../domain/SignInCodeRateLimitedError";
import { contactPhoneCodeException } from "./contactPhoneCodeException";

function response(error: unknown): unknown {
  const mapped = contactPhoneCodeException(error);
  expect(mapped).toBeInstanceOf(BadRequestException);
  return (mapped as BadRequestException).getResponse();
}

describe("contactPhoneCodeException", () => {
  it("maps a wrong code to INVALID_OTP with the attempts left", () => {
    expect(response(new InvalidSignInCodeError(3))).toMatchObject({
      code: "INVALID_OTP",
      details: { attemptsLeft: 3 },
    });
  });

  it.each([
    ["Too many attempts", "OTP_LOCKED"],
    ["OTP code has expired", "OTP_EXPIRED"],
    ["OTP code has already been used", "OTP_ALREADY_USED"],
    ["No Sign-in Code request found", "OTP_NOT_FOUND"],
  ])("maps %s to %s without details", (message, code) => {
    const body = response(new Error(message)) as Record<string, unknown>;
    expect(body).toMatchObject({ code });
    expect(body).not.toHaveProperty("details");
  });

  it.each([
    [{ allowed: false, reason: "BACKOFF", resendInSeconds: 42 }, { reason: "backoff", retryInSeconds: 42 }],
    [{ allowed: false, reason: "DESTINATION_LIMIT", resendInSeconds: 0 }, { reason: "destination_limit", retryInSeconds: 0 }],
    [{ allowed: false, reason: "IP_LIMIT", resendInSeconds: 0 }, { reason: "ip_limit", retryInSeconds: 0 }],
  ] as const)("maps a refused request to RATE_LIMITED with its reason", (refusal, details) => {
    expect(response(new SignInCodeRateLimitedError(refusal))).toMatchObject({
      code: "RATE_LIMITED",
      details,
    });
  });

  it("maps a phone identity rejects to VALIDATION_FAILED", () => {
    expect(response(new Error("Phone must be +993[6-7]XXXXXXX"))).toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("leaves any other error to the caller", () => {
    expect(contactPhoneCodeException(new Error("boom"))).toBeNull();
    expect(contactPhoneCodeException("text")).toBeNull();
  });
});
