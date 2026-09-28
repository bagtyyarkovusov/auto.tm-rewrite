import { describe, expect, it } from "vitest";

import { isAccessTokenExpired } from "./accessTokenExpiry";

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(claims)}.signature`;
}

const NOW = Date.UTC(2026, 8, 28, 12, 0, 0);
const FIFTEEN_MINUTES = 15 * 60;

/** A 15-minute token the device stored `ageMs` before NOW. */
function session(ageMs: number, claims: Record<string, unknown> = { iat: 1_000, exp: 1_000 + FIFTEEN_MINUTES }) {
  return { accessToken: jwt(claims), storedAt: new Date(NOW - ageMs).toISOString() };
}

describe("isAccessTokenExpired", () => {
  it("is true once the token's lifetime has passed since it was stored", () => {
    expect(isAccessTokenExpired(session(16 * 60_000), NOW)).toBe(true);
  });

  it("is true within the 30-second skew before expiry", () => {
    expect(isAccessTokenExpired(session(FIFTEEN_MINUTES * 1000 - 10_000), NOW)).toBe(true);
  });

  it("is false while the token is comfortably valid", () => {
    expect(isAccessTokenExpired(session(60_000), NOW)).toBe(false);
  });

  it("ignores the device clock's offset from the server", () => {
    // Server time in exp/iat is far behind the device clock (a phone running
    // hours fast); a freshly stored token must still count as valid.
    const serverSeconds = NOW / 1000 - 3 * 60 * 60;
    const fresh = session(1_000, { iat: serverSeconds, exp: serverSeconds + FIFTEEN_MINUTES });
    expect(isAccessTokenExpired(fresh, NOW)).toBe(false);
  });

  it("treats unreadable tokens, missing claims, and a bad storedAt as not expired", () => {
    const storedAt = new Date(NOW - 60 * 60_000).toISOString();
    expect(isAccessTokenExpired({ accessToken: "token-123", storedAt }, NOW)).toBe(false);
    expect(isAccessTokenExpired({ accessToken: "a.%%%.c", storedAt }, NOW)).toBe(false);
    expect(isAccessTokenExpired({ accessToken: jwt({ exp: 1 }), storedAt }, NOW)).toBe(false);
    expect(isAccessTokenExpired({ accessToken: jwt({ iat: 1 }), storedAt }, NOW)).toBe(false);
    expect(isAccessTokenExpired({ ...session(60 * 60_000), storedAt: "" }, NOW)).toBe(false);
  });
});
