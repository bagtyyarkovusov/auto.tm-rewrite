import type { Redis } from "ioredis";

import type { DailySendCap, DailySendCapDecision } from "../domain/DailySendCap";
import { utcDay } from "../domain/DailySendCap";

// One set of send IDs per UTC day. Checking membership first makes a retried
// job keep its slot; the size check and the add run atomically, so concurrent
// workers cannot both take the last slot. Keys outlive their day by a day and
// then expire.
const RESERVE_SCRIPT = `
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then return 1 end
if redis.call('SCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('SADD', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], 172800)
return 1
`;

export const DEFAULT_DAILY_SEND_CAP_KEY_PREFIX = "email:daily-sends:";

export class RedisDailySendCap implements DailySendCap {
  constructor(
    private readonly redis: Redis,
    private readonly cap: number,
    private readonly keyPrefix: string = DEFAULT_DAILY_SEND_CAP_KEY_PREFIX,
  ) {}

  async reserve(sendId: string, now: Date): Promise<DailySendCapDecision> {
    const allowed = await this.redis.eval(
      RESERVE_SCRIPT,
      1,
      `${this.keyPrefix}${utcDay(now)}`,
      sendId,
      String(this.cap),
    );
    return allowed === 1 ? { allowed: true } : { allowed: false, cap: this.cap };
  }
}
