import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { AuthSchemas } from "@auto-tm/contracts";
import type { ReservedPhoneAttemptLedger } from "../domain/ports/ReservedPhoneAttemptLedger";
import { RESERVED_PHONE_FAILURE_POLICY } from "../domain/OtpAttemptLedger";

// One atomic operation admits a correct code or counts a failure. Redis expiry
// owns time across API instances. Locked reads never refresh the deadline.
const CHECK_ATTEMPT = `
local failures = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[2])
if failures >= limit then return 1 end
if ARGV[1] == '1' then
  failures = redis.call('INCR', KEYS[1])
  if failures >= limit then
    redis.call('PEXPIRE', KEYS[1], ARGV[4])
    return 1
  end
  if failures == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[3]) end
end
return 0
`;

@Injectable()
export class RedisReservedPhoneAttemptLedger implements ReservedPhoneAttemptLedger {
  constructor(
    @InjectQueue(AuthSchemas.EMAIL_CODE_QUEUE) private readonly queue: Queue,
  ) {}

  async check(input: { destination: string; failed: boolean }): Promise<{ locked: boolean }> {
    const redis = await this.queue.client;
    // Reuse the module's managed Redis connection and namespace. Neither a
    // phone nor a code appears in the key. Ordinary probes create no keys.
    const key = this.queue.toKey(`reserved-phone-attempt:${createHash("sha256").update(input.destination).digest("hex")}`);
    const result = await redis.eval(
      CHECK_ATTEMPT, 1, key, input.failed ? "1" : "0",
      RESERVED_PHONE_FAILURE_POLICY.maxFailures,
      RESERVED_PHONE_FAILURE_POLICY.failureWindowMs,
      RESERVED_PHONE_FAILURE_POLICY.lockMs,
    );
    if (result !== 0 && result !== 1) throw new Error("Invalid sign-in attempt ledger result");
    return { locked: result === 1 };
  }
}
