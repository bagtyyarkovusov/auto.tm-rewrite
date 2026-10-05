import {
  InvalidOtpDetailsSchema,
  ListingsSchemas,
  RateLimitReason,
  RateLimitedDetailsSchema,
} from "@auto-tm/contracts";

import { ApiError } from "../../api/client";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface ContactPhoneRequestErrorCopy {
  message: string;
  /** The number hit its daily code budget: show the Help link, with no time (ADR-0081). */
  dailyLimit: boolean;
  /** A backoff refusal carries the wait in seconds; null otherwise. */
  retryInSeconds: number | null;
}

export interface ContactPhoneVerifyErrorCopy {
  message: string;
  /** A locked or expired code cannot be fixed by typing; offer "Send a new code". */
  needsNewCode: boolean;
}

function rateLimitDetails(error: ApiError) {
  const details = RateLimitedDetailsSchema.safeParse(error.details);
  return details.success ? details.data : null;
}

/** Errors of `POST /me/contact-phones/request`, on the number screen and on resend. */
export function getContactPhoneRequestErrorCopy(
  error: unknown,
  t: Translate,
): ContactPhoneRequestErrorCopy {
  if (!(error instanceof ApiError)) {
    return { message: t("offline"), dailyLimit: false, retryInSeconds: null };
  }
  if (error.code === "VALIDATION_FAILED") {
    return {
      message: t("contactPhoneFormatError"),
      dailyLimit: false,
      retryInSeconds: null,
    };
  }
  if (error.code === "NETWORK_ERROR" || error.status === 0) {
    return { message: t("offline"), dailyLimit: false, retryInSeconds: null };
  }
  if (error.code === "RATE_LIMITED" || error.status === 429) {
    const details = rateLimitDetails(error);
    if (details?.reason === RateLimitReason.DestinationLimit) {
      return {
        message: t("contactPhoneDailyLimit"),
        dailyLimit: true,
        retryInSeconds: null,
      };
    }
    return {
      message: t("contactPhoneRateLimited"),
      dailyLimit: false,
      retryInSeconds:
        details?.reason === RateLimitReason.Backoff
          ? details.retryInSeconds
          : null,
    };
  }
  return { message: t("requestFailed"), dailyLimit: false, retryInSeconds: null };
}

/** Errors of `POST /me/contact-phones/verify` on the code screen. */
export function getContactPhoneVerifyErrorCopy(
  error: unknown,
  t: Translate,
): ContactPhoneVerifyErrorCopy {
  if (!(error instanceof ApiError)) {
    return { message: t("offline"), needsNewCode: false };
  }
  switch (error.code) {
    case "INVALID_OTP": {
      const details = InvalidOtpDetailsSchema.safeParse(error.details);
      if (details.success) {
        return {
          message: t("contactPhoneWrongCodeAttemptsLeft", {
            count: details.data.attemptsLeft,
          }),
          needsNewCode: false,
        };
      }
      return { message: t("contactPhoneWrongCode"), needsNewCode: false };
    }
    case "OTP_LOCKED":
      return { message: t("contactPhoneLockedCode"), needsNewCode: true };
    case "OTP_EXPIRED":
    case "OTP_NOT_FOUND":
    case "OTP_ALREADY_USED":
      return { message: t("contactPhoneExpiredCode"), needsNewCode: true };
  }
  if (error.code === "RATE_LIMITED" || error.status === 429) {
    return { message: t("contactPhoneRateLimited"), needsNewCode: false };
  }
  if (error.code === "NETWORK_ERROR" || error.status === 0) {
    return { message: t("offline"), needsNewCode: false };
  }
  return { message: t("requestFailed"), needsNewCode: false };
}

export function isContactPhoneRequiredError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.code === ListingsSchemas.ListingsErrorCode.ContactPhoneRequired
  );
}

export function isContactPhoneNotConfirmedError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.code === ListingsSchemas.ListingsErrorCode.ContactPhoneNotConfirmed
  );
}

/** Publish and republish rejections that send the seller to confirm the contact phone. */
export function isContactPhonePublishError(error: unknown): boolean {
  return (
    isContactPhoneRequiredError(error) || isContactPhoneNotConfirmedError(error)
  );
}
