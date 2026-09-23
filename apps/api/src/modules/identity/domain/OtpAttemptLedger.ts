export interface RateLimitInput {
  destinationCount24h: number;
  ipCount1h: number;
  lastAttemptAt: Date | null;
  now: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  resendInSeconds: number;
  reason?: "DESTINATION_LIMIT" | "IP_LIMIT" | "BACKOFF";
}

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
