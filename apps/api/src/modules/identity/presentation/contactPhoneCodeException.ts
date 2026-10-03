import { BadRequestException } from "@nestjs/common";
import { ErrorCode, type InvalidOtpDetails } from "@auto-tm/contracts";

import { InvalidSignInCodeError } from "../domain/InvalidSignInCodeError";
import { signInCodeRateLimitedException } from "./signInCodeRateLimited";

const CODE_ERRORS: Record<string, { code: ErrorCode; message: string }> = {
  "Too many attempts": {
    code: ErrorCode.OtpLocked,
    message: "Too many failed attempts. Please request a new code.",
  },
  "OTP code has expired": {
    code: ErrorCode.OtpExpired,
    message: "OTP code has expired. Please request a new one.",
  },
  "OTP code has already been used": {
    code: ErrorCode.OtpAlreadyUsed,
    message: "This code has already been used.",
  },
  "No Sign-in Code request found": {
    code: ErrorCode.OtpNotFound,
    message: "No code request found. Please request a code first.",
  },
};

/**
 * Turns a refused contact-phone code request or confirmation into the HTTP
 * error ADR-0081 names, so Listings maps identity's errors without importing
 * identity internals. Returns null for any other error.
 */
export function contactPhoneCodeException(error: unknown): BadRequestException | null {
  const rateLimited = signInCodeRateLimitedException(
    error,
    "Too many code requests. Please wait before trying again.",
  );
  if (rateLimited !== null) return rateLimited;

  if (error instanceof InvalidSignInCodeError) {
    const details: InvalidOtpDetails = { attemptsLeft: error.attemptsLeft };
    return new BadRequestException({
      code: ErrorCode.InvalidOtp,
      message: "Invalid OTP code. Please try again.",
      details,
    });
  }
  if (!(error instanceof Error)) return null;

  if (error.message.startsWith("Phone must be")) {
    return new BadRequestException({
      code: ErrorCode.ValidationFailed,
      message: error.message,
    });
  }
  const mapped = CODE_ERRORS[error.message];
  return mapped ? new BadRequestException(mapped) : null;
}
