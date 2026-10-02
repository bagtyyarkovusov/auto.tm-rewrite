import type { RateLimitReason, RateLimitRefusal } from "./OtpAttemptLedger";

/**
 * A Sign-in Code request the OtpAttemptLedger refused. Carries the ledger's
 * reason so the app can tell "wait a moment" from "no more codes today".
 * The reason depends only on the destination and IP counts, never on whether
 * a User holds the destination.
 */
export class SignInCodeRateLimitedError extends Error {
  readonly reason: RateLimitReason;
  /** Remaining backoff for BACKOFF; 0 when the wait is a window, not a timer. */
  readonly retryInSeconds: number;

  constructor(refusal: RateLimitRefusal) {
    super("Too many OTP requests");
    this.name = "SignInCodeRateLimitedError";
    this.reason = refusal.reason;
    this.retryInSeconds =
      refusal.reason === "BACKOFF" ? refusal.resendInSeconds : 0;
  }
}
