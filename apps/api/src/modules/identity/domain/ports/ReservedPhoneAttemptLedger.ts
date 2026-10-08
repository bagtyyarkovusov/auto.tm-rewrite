/**
 * Shared failure budget for reserved fixed-code phone sign-in. A blocked
 * attempt must never extend the lock; a successful attempt resets the count.
 */
export interface ReservedPhoneAttemptLedger {
  recordAttempt(input: { destination: string; failed: boolean }): Promise<{ locked: boolean }>;
}

export const RESERVED_PHONE_ATTEMPT_LEDGER = Symbol("ReservedPhoneAttemptLedger");
