import type { DailySendCap, DailySendCapDecision } from "../domain/DailySendCap";
import { utcDay } from "../domain/DailySendCap";

/** Same counting rules as `RedisDailySendCap`, held in memory. For tests. */
export class InMemoryDailySendCap implements DailySendCap {
  private days = new Map<string, Set<string>>();

  constructor(private readonly cap: number) {}

  async reserve(sendId: string, now: Date): Promise<DailySendCapDecision> {
    const day = utcDay(now);
    const ids = this.days.get(day) ?? new Set<string>();
    this.days.set(day, ids);

    if (ids.has(sendId)) return { allowed: true };
    if (ids.size >= this.cap) return { allowed: false, cap: this.cap };
    ids.add(sendId);
    return { allowed: true };
  }
}
