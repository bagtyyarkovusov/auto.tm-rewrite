import { z } from "zod";

export const ErrorCode = {
  ValidationFailed: "VALIDATION_FAILED",
  Unauthorized: "UNAUTHORIZED",
  Forbidden: "FORBIDDEN",
  NotFound: "NOT_FOUND",
  UserNotFound: "USER_NOT_FOUND",
  Conflict: "CONFLICT",
  RateLimited: "RATE_LIMITED",
  OtpExpired: "OTP_EXPIRED",
  OtpAlreadyUsed: "OTP_ALREADY_USED",
  InvalidOtp: "INVALID_OTP",
  OtpLocked: "OTP_LOCKED",
  OtpNotFound: "OTP_NOT_FOUND",
  SignInMethodTaken: "SIGN_IN_METHOD_TAKEN",
  Internal: "INTERNAL",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// Why a Sign-in Code request was refused (ADR-0054 "Codes and limits"). Sent
// as `details` on a RATE_LIMITED error from the three code-request endpoints.
// The reason depends only on the destination and IP counts, never on whether a
// User holds the destination.
export const RateLimitReason = {
  DestinationLimit: "destination_limit",
  IpLimit: "ip_limit",
  Backoff: "backoff",
} as const;
export type RateLimitReason =
  (typeof RateLimitReason)[keyof typeof RateLimitReason];

export const RateLimitReasonSchema = z.nativeEnum(RateLimitReason);

export const RateLimitedDetailsSchema = z.object({
  reason: RateLimitReasonSchema,
  // Remaining wait for `backoff`; 0 for the limits, which clear with a window.
  retryInSeconds: z.number().int().nonnegative(),
});
export type RateLimitedDetails = z.infer<typeof RateLimitedDetailsSchema>;

export const ErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: z.nativeEnum(ErrorCode),
  message: z.string(),
  details: z.unknown().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
