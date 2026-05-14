import { randomInt } from "node:crypto";

const CODE_RE = /^\d{6}$/;

export class OtpCode {
  private constructor(readonly value: string) {}

  static create(raw: string): OtpCode {
    if (!CODE_RE.test(raw)) {
      throw new Error("OTP code must be exactly six digits");
    }
    return new OtpCode(raw);
  }

  static generate(): OtpCode {
    const code = String(randomInt(0, 999999)).padStart(6, "0");
    return new OtpCode(code);
  }

  equals(other: OtpCode): boolean {
    return this.value === other.value;
  }
}
