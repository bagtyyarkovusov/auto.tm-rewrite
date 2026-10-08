/** Shared failure budget. A blocked attempt must never extend the lock. */
export interface ReservedPhoneAttemptLedger {
  check(input: { destination: string; failed: boolean }): Promise<{ locked: boolean }>;
}

export const RESERVED_PHONE_ATTEMPT_LEDGER = Symbol("ReservedPhoneAttemptLedger");
