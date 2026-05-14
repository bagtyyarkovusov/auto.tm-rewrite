export interface RateLimitInput {
  phoneCount24h: number;
  ipCount1h: number;
  lastAttemptAt: Date | null;
  now: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  resendInSeconds: number;
  reason?: "PHONE_LIMIT" | "IP_LIMIT";
}

export class OtpAttemptLedger {
  constructor(
    private readonly phoneLimit: number,
    private readonly ipLimit: number,
    private readonly baseBackoffSeconds: number,
  ) {}

  check(input: RateLimitInput): RateLimitResult {
    const { phoneCount24h, ipCount1h, lastAttemptAt, now } = input;

    // Check hard limits
    const phoneExceeded = phoneCount24h >= this.phoneLimit;
    const ipExceeded = ipCount1h >= this.ipLimit;

    // Compute exponential backoff regardless of limit status
    const resendInSeconds = this.computeBackoff(phoneCount24h, lastAttemptAt, now);

    if (phoneExceeded) {
      return { allowed: false, resendInSeconds, reason: "PHONE_LIMIT" };
    }

    if (ipExceeded) {
      return { allowed: false, resendInSeconds, reason: "IP_LIMIT" };
    }

    return { allowed: true, resendInSeconds };
  }

  private computeBackoff(
    phoneCount24h: number,
    lastAttemptAt: Date | null,
    now: Date,
  ): number {
    // Exponential backoff: base * 2^N for N prior requests
    // After 0 requests → 60s, after 1 → 120s, after 2 → 240s, etc.
    const backoffTotal = this.baseBackoffSeconds * Math.pow(2, phoneCount24h);

    if (lastAttemptAt === null) return backoffTotal;

    const elapsed = (now.getTime() - lastAttemptAt.getTime()) / 1000;
    return Math.max(0, Math.ceil(backoffTotal - elapsed));
  }
}
