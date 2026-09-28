import { describe, it, expect } from "vitest";
import { OtpAttemptLedger } from "./OtpAttemptLedger";

const DESTINATION_LIMIT = 5;
const IP_LIMIT = 10;
const BASE_BACKOFF_S = 60;

function frozenNow(): Date {
  return new Date("2026-05-14T12:00:00Z");
}

function ledger() {
  return new OtpAttemptLedger(DESTINATION_LIMIT, IP_LIMIT, BASE_BACKOFF_S);
}

describe("OtpAttemptLedger", () => {
  it("allows request when no prior attempts", () => {
    const result = ledger().check({
      destinationCount24h: 0,
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
      destinationCount24h: 3,
      ipCount1h: 5,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks when phone limit reached", () => {
    const result = ledger().check({
      destinationCount24h: 5,
      ipCount1h: 0,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("DESTINATION_LIMIT");
  });

  it("blocks when phone limit exceeded", () => {
    const result = ledger().check({
      destinationCount24h: 7,
      ipCount1h: 0,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("DESTINATION_LIMIT");
  });

  it("blocks when IP limit reached", () => {
    const result = ledger().check({
      destinationCount24h: 2,
      ipCount1h: 10,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("IP_LIMIT");
  });

  it("blocks when IP limit exceeded", () => {
    const result = ledger().check({
      destinationCount24h: 2,
      ipCount1h: 15,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("IP_LIMIT");
  });

  it("phone limit takes priority over IP limit", () => {
    const result = ledger().check({
      destinationCount24h: 5,
      ipCount1h: 10,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.reason).toBe("DESTINATION_LIMIT");
  });

  it("computes exponential backoff with 1 prior request", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 10_000);
    const result = ledger().check({
      destinationCount24h: 1,
      ipCount1h: 1,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // The first accepted request has a 60-second cooldown; 10 seconds elapsed.
    expect(result.resendInSeconds).toBe(50);
  });

  it("computes exponential backoff with 2 prior requests", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 30_000);
    const result = ledger().check({
      destinationCount24h: 2,
      ipCount1h: 2,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // The second accepted request has a 120-second cooldown; 30 seconds elapsed.
    expect(result.resendInSeconds).toBe(90);
  });

  it("computes exponential backoff with 3 prior requests", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 10_000);
    const result = ledger().check({
      destinationCount24h: 3,
      ipCount1h: 3,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // The third accepted request has a 240-second cooldown; 10 seconds elapsed.
    expect(result.resendInSeconds).toBe(230);
  });

  it("returns the next cooldown when the current backoff has elapsed", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 300_000);
    const result = ledger().check({
      destinationCount24h: 1,
      ipCount1h: 1,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // Current cooldown expired; the next accepted request returns 120 seconds.
    expect(result.resendInSeconds).toBe(120);
  });

  it("returns resend even when blocked by limit", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 50_000);
    const result = ledger().check({
      destinationCount24h: 5,
      ipCount1h: 0,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // Blocked by destination limit; latest request had a 960-second cooldown.
    expect(result.allowed).toBe(false);
    expect(result.resendInSeconds).toBe(910);
  });

  it("returns base backoff when lastAttemptAt is null", () => {
    const result = ledger().check({
      destinationCount24h: 0,
      ipCount1h: 0,
      lastAttemptAt: null,
      now: frozenNow(),
    });
    expect(result.resendInSeconds).toBe(60);
  });

  it("caps backoff at reasonable maximum", () => {
    const lastAttempt = new Date(frozenNow().getTime() - 5_000);
    const result = ledger().check({
      destinationCount24h: 4,
      ipCount1h: 4,
      lastAttemptAt: lastAttempt,
      now: frozenNow(),
    });
    // The fourth accepted request has a 480-second cooldown; 5 seconds elapsed.
    expect(result.resendInSeconds).toBe(475);
    // Not huge for 4 attempts
    expect(result.resendInSeconds).toBeLessThan(1000);
  });
});
