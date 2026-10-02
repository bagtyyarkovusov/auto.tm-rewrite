import { BadRequestException } from "@nestjs/common";
import {
  ErrorCode,
  RateLimitReason,
  type RateLimitedDetails,
} from "@auto-tm/contracts";

import type { RateLimitReason as LedgerReason } from "../domain/OtpAttemptLedger";
import { SignInCodeRateLimitedError } from "../domain/SignInCodeRateLimitedError";

const CONTRACT_REASONS: Record<LedgerReason, RateLimitReason> = {
  DESTINATION_LIMIT: RateLimitReason.DestinationLimit,
  IP_LIMIT: RateLimitReason.IpLimit,
  BACKOFF: RateLimitReason.Backoff,
};

/**
 * Maps a refused Sign-in Code request to RATE_LIMITED with the reason. Status
 * and code are what clients already read; `details` is additive. Returns null
 * for any other error so the caller keeps its own mapping.
 */
export function signInCodeRateLimitedException(
  error: unknown,
  message: string,
): BadRequestException | null {
  if (!(error instanceof SignInCodeRateLimitedError)) return null;

  const details: RateLimitedDetails = {
    reason: CONTRACT_REASONS[error.reason],
    retryInSeconds: error.retryInSeconds,
  };
  return new BadRequestException({
    code: ErrorCode.RateLimited,
    message,
    details,
  });
}
