import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { AuthSchemas } from "@auto-tm/contracts";
import type { ReservedPhoneAttemptLedger } from "../domain/ports/ReservedPhoneAttemptLedger";
import { RESERVED_PHONE_FAILURE_POLICY } from "../domain/ReservedPhoneFailurePolicy";

// Identity-owned namespace: these keys must survive BullMQ queue lifecycle
// operations such as obliterate, so they are not built with queue.toKey().
// The unsalted SHA-256 of an E.164 number is reversible by dictionary; the
// ADR records that accepted limitation.
const KEY_PREFIX = "identity:reserved-phone-attempt";

export function reservedPhoneAttemptKey(destination: string): string {
  return `${KEY_PREFIX}:${createHash("sha256").update(destination).digest("hex")}`;
}

// One atomic operation admits a correct code (resetting the count), counts a
// failure, or refuses during a lock. Redis expiry owns time across API
// instances. Locked reads never refresh the deadline, and a key that lost its
// TTL cannot lock a destination forever.
const RECORD_ATTEMPT = `
local failures = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[2])
if failures >= limit then
  if redis.call('PTTL', KEYS[1]) == -1 then redis.call('PEXPIRE', KEYS[1], ARGV[4]) end
  return 1
end
if ARGV[1] == '1' then
  failures = redis.call('INCR', KEYS[1])
  if failures >= limit then
    redis.call('PEXPIRE', KEYS[1], ARGV[4])
    return 1
  end
  if failures == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[3]) end
else
  redis.call('DEL', KEYS[1])
end
return 0
`;

@Injectable()
export class RedisReservedPhoneAttemptLedger implements ReservedPhoneAttemptLedger {
  constructor(
    @InjectQueue(AuthSchemas.EMAIL_CODE_QUEUE) private readonly queue: Queue,
  ) {}

  async recordAttempt(input: { destination: string; failed: boolean }): Promise<{ locked: boolean }> {
    const redis = await this.queue.client;
    // Reuse the module's managed Redis connection. Neither a phone nor a code
    // appears in the key. A Redis error or a slow probe fails closed: the
    // reserved sign-in is refused instead of gaining an unlimited bypass.
    const key = reservedPhoneAttemptKey(input.destination);
    const probe = redis.eval(
      RECORD_ATTEMPT, 1, key, input.failed ? "1" : "0",
      RESERVED_PHONE_FAILURE_POLICY.maxFailures,
      RESERVED_PHONE_FAILURE_POLICY.failureWindowMs,
      RESERVED_PHONE_FAILURE_POLICY.lockMs,
    );
    // A slow probe rejects after a short timeout instead of holding the
    // request; VerifyOtp maps any ledger failure to a closed refusal.
    const result = await this.withTimeout(probe);
    if (result !== 0 && result !== 1) throw new Error("Invalid sign-in attempt ledger result");
    return { locked: result === 1 };
  }

  private async withTimeout(probe: Promise<unknown>): Promise<unknown> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        probe,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Reserved phone attempt probe timed out")),
            RESERVED_PHONE_FAILURE_POLICY.probeTimeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
      // The probe may settle after the timeout won the race; a late rejection
      // must not surface as an unhandled error.
      probe.catch(() => {});
    }
  }
}
