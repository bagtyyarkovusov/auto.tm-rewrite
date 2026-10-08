import type { ClockPort } from "../../domain/ports/ClockPort";
import type { ReservedPhoneAttemptLedger } from "../../domain/ports/ReservedPhoneAttemptLedger";
import { RESERVED_PHONE_FAILURE_POLICY } from "../../domain/OtpAttemptLedger";

export class InMemoryReservedPhoneAttemptLedger implements ReservedPhoneAttemptLedger {
  private readonly entries = new Map<string, { failures: number; expiresAt: number }>();

  constructor(private readonly clock: ClockPort) {}

  async check(input: { destination: string; failed: boolean }): Promise<{ locked: boolean }> {
    const now = this.clock.now().getTime();
    let entry = this.entries.get(input.destination);
    if (entry && entry.expiresAt <= now) {
      this.entries.delete(input.destination);
      entry = undefined;
    }
    if (entry && entry.failures >= RESERVED_PHONE_FAILURE_POLICY.maxFailures) return { locked: true };
    if (!input.failed) return { locked: false };
    entry ??= { failures: 0, expiresAt: now + RESERVED_PHONE_FAILURE_POLICY.failureWindowMs };
    entry.failures += 1;
    if (entry.failures >= RESERVED_PHONE_FAILURE_POLICY.maxFailures) entry.expiresAt = now + RESERVED_PHONE_FAILURE_POLICY.lockMs;
    this.entries.set(input.destination, entry);
    return { locked: entry.failures >= RESERVED_PHONE_FAILURE_POLICY.maxFailures };
  }
}
