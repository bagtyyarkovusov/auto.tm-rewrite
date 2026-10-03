/**
 * A wrong code that still has attempts left. Keeps the message existing
 * controllers match on, and adds how many tries remain (ADR-0081).
 */
export class InvalidSignInCodeError extends Error {
  constructor(readonly attemptsLeft: number) {
    super("Invalid OTP code");
    this.name = "InvalidSignInCodeError";
  }
}
