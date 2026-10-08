export interface RateLimitInput {
  destinationCount24h: number;
  ipCount1h: number;
  lastAttemptAt: Date | null;
  now: Date;
}

export type RateLimitReason = "DESTINATION_LIMIT" | "IP_LIMIT" | "BACKOFF";

export interface RateLimitAllowed {
  allowed: true;
  resendInSeconds: number;
  reason?: undefined;
}

export interface RateLimitRefusal {
  allowed: false;
  resendInSeconds: number;
  reason: RateLimitReason;
}

export type RateLimitResult = RateLimitAllowed | RateLimitRefusal;

export const SIGN_IN_CODE_RATE_POLICY = {
  destinationLimit: 5,
  destinationWindowMs: 24 * 60 * 60 * 1000,
  ipLimit: 10,
  ipWindowMs: 60 * 60 * 1000,
  baseBackoffSeconds: 60,
} as const;

export class OtpAttemptLedger {
  constructor(
    private readonly destinationLimit: number,
    private readonly ipLimit: number,
    private readonly baseBackoffSeconds: number,
  ) {}

  check(input: RateLimitInput): RateLimitResult {
    const { destinationCount24h, ipCount1h, lastAttemptAt, now } = input;

    // Check hard limits
    const destinationExceeded = destinationCount24h >= this.destinationLimit;
    const ipExceeded = ipCount1h >= this.ipLimit;

    const currentBackoffRemaining = this.computeCurrentBackoffRemaining(
      destinationCount24h,
      lastAttemptAt,
      now,
    );
    const nextBackoffSeconds =
      this.baseBackoffSeconds * Math.pow(2, destinationCount24h);

    if (destinationExceeded) {
      return {
        allowed: false,
        resendInSeconds: currentBackoffRemaining,
        reason: "DESTINATION_LIMIT",
      };
    }

    if (ipExceeded) {
      return {
        allowed: false,
        resendInSeconds: currentBackoffRemaining,
        reason: "IP_LIMIT",
      };
    }

    if (currentBackoffRemaining > 0) {
      return {
        allowed: false,
        resendInSeconds: currentBackoffRemaining,
        reason: "BACKOFF",
      };
    }

    return { allowed: true, resendInSeconds: nextBackoffSeconds };
  }

  private computeCurrentBackoffRemaining(
    destinationCount24h: number,
    lastAttemptAt: Date | null,
    now: Date,
  ): number {
    if (lastAttemptAt === null) return 0;

    // The latest accepted request was created after N-1 prior requests.
    const priorRequests = Math.max(0, destinationCount24h - 1);
    const backoffTotal = this.baseBackoffSeconds * Math.pow(2, priorRequests);

    const elapsed = (now.getTime() - lastAttemptAt.getTime()) / 1000;
    return Math.max(0, Math.ceil(backoffTotal - elapsed));
  }
}

/** Fixed-code verification has a separate budget from code issuance. */
export const RESERVED_PHONE_FAILURE_POLICY = {
  maxFailures: 5,
  failureWindowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
} as const;
