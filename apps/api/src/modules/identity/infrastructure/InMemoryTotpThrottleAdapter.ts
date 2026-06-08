import type { TotpThrottlePort } from "../domain/ports/TotpThrottlePort";

interface Entry {
  count: number;
  windowStart: number;
}

export class InMemoryTotpThrottleAdapter implements TotpThrottlePort {
  private store = new Map<string, Entry>();
  private readonly windowMs: number;

  constructor(windowMs: number = 10 * 60 * 1000) {
    this.windowMs = windowMs;
  }

  async recordFailure(userId: string, sessionId: string): Promise<number> {
    const key = `${userId}:${sessionId}`;
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      const newEntry: Entry = { count: 1, windowStart: now };
      this.store.set(key, newEntry);
      return 1;
    }

    entry.count += 1;
    return entry.count;
  }

  async reset(userId: string, sessionId: string): Promise<void> {
    const key = `${userId}:${sessionId}`;
    this.store.delete(key);
  }
}
