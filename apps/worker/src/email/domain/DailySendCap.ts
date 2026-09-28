export type DailySendCapDecision =
  | { allowed: true }
  | { allowed: false; cap: number };

/**
 * Counts email sends per UTC day. A send is counted once per `sendId`, so a
 * retried job does not use up a second slot.
 */
export interface DailySendCap {
  reserve(sendId: string, now: Date): Promise<DailySendCapDecision>;
}

export const DAILY_SEND_CAP = Symbol("DailySendCap");

/** `YYYY-MM-DD` of the UTC day containing `now`. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}
