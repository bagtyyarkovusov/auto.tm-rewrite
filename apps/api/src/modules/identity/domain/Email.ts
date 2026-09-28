const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

/**
 * An email Sign-in Method value (ADR-0054). Stored trimmed and lowercased;
 * no provider-specific rewriting such as Gmail dot removal.
 */
export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (normalized.length > MAX_LENGTH || !EMAIL_RE.test(normalized)) {
      throw new Error("Email must be a valid address");
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
