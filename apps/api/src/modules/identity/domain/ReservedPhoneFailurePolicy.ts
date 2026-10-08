/** Fixed-code verification has a separate budget from code issuance. */
export const RESERVED_PHONE_FAILURE_POLICY = {
  maxFailures: 5,
  failureWindowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
  // A slow or hung Redis must surface as a refused reserved sign-in, never as
  // an unbounded wait; ordinary phone sign-in never probes the ledger.
  probeTimeoutMs: 2_000,
} as const;
