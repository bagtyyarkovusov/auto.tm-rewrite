import { describe, it, expect } from "vitest";
import { OtpAttemptLedger } from "./OtpAttemptLedger";

const PHONE_LIMIT = 5;
const IP_LIMIT = 10;
const BASE_BACKOFF_S = 60;

function frozenNow(): Date {
  return new Date("2026-05-14T12:00:00Z");
}

function ledger() {
  return new OtpAttemptLedger(PHONE_LIMIT, IP_LIMIT, BASE_BACKOFF_S);
}

describe("OtpAttemptLedger", () => {
  it("allows request when no prior attempts", () => {
    const result = ledger().check({
      phoneCount24h: 0,
      ipCount1h: 0,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(true);
    // 60 * 2^0 = 60s backoff after first request
    expect(result.resendInSeconds).toBe(60);
  });

  it("allows request when under both limits", () => {
    const result = ledger().check({
      phoneCount24h: 3,
      ipCount1h: 5,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks when phone limit reached", () => {
    const result = ledger().check({
      phoneCount24h: 5,
      ipCount1h: 0,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("PHONE_LIMIT");
  });

  it("blocks when phone limit exceeded", () => {
    const result = ledger().check({
      phoneCount24h: 7,
      ipCount1h: 0,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("PHONE_LIMIT");
  });

  it("blocks when IP limit reached", () => {
    const result = ledger().check({
      phoneCount24h: 2,
      ipCount1h: 10,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("IP_LIMIT");
  });

  it("blocks when IP limit exceeded", () => {
    const result = ledger().check({
      phoneCount24h: 2,
      ipCount1h: 15,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("IP_LIMIT");
  });

  it("phone limit takes priority over IP limit", () => {
    const result = ledger().check({
      phoneCount24h: 5,
      ipCount1h: 10,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.reason).toBe("PHONE_LIMIT");
  });

  it("computes exponential backoff with 1 prior request", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 10_000);
    const result = ledger().check({
      phoneCount24h: 1,
      ipCount1h: 1,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // 60 * 2^1 = 120, elapsed 10s → 110s remaining
    expect(result.resendInSeconds).toBe(110);
  });

  it("computes exponential backoff with 2 prior requests", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 30_000);
    const result = ledger().check({
      phoneCount24h: 2,
      ipCount1h: 2,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // 60 * 2^2 = 240, elapsed 30s → 210s remaining
    expect(result.resendInSeconds).toBe(210);
  });

  it("computes exponential backoff with 3 prior requests", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 10_000);
    const result = ledger().check({
      phoneCount24h: 3,
      ipCount1h: 3,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // 60 * 2^3 = 480, elapsed 10s → 470s remaining
    expect(result.resendInSeconds).toBe(470);
  });

  it("returns zero resend when backoff has elapsed", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 300_000);
    const result = ledger().check({
      phoneCount24h: 1,
      ipCount1h: 1,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // 60 * 2^1 = 120, elapsed 300s → backoff expired
    expect(result.resendInSeconds).toBe(0);
  });

  it("returns resend even when blocked by limit", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 50_000);
    const result = ledger().check({
      phoneCount24h: 5,
      ipCount1h: 0,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // Blocked by phone limit but resend still computed
    // 60 * 2^5 = 1920, elapsed 50s → 1870 remaining
    expect(result.allowed).toBe(false);
    expect(result.resendInSeconds).toBe(1870);
  });

  it("returns base backoff when lastAttemptAt is null", () => {
    const result = ledger().check({
      phoneCount24h: 0,
      ipCount1h: 0,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.resendInSeconds).toBe(60);
  });

  it("caps backoff at reasonable maximum", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 5_000);
    const result = ledger().check({
      phoneCount24h: 4,
      ipCount1h: 4,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // 60 * 2^4 = 960, elapsed 5s → 955 remaining
    expect(result.resendInSeconds).toBe(955);
    // Not huge for 4 attempts
    expect(result.resendInSeconds).toBeLessThan(1000);
  });
});
