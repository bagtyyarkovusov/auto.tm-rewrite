import { describe, expect, it } from "vitest";

import { isAccessTokenExpired } from "./accessTokenExpiry";

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(claims)}.signature`;
}

const NOW = Date.UTC(2026, 8, 28, 12, 0, 0);
const nowSeconds = NOW / 1000;

describe("isAccessTokenExpired", () => {
  it("is true once exp has passed", () => {
    expect(isAccessTokenExpired(jwt({ exp: nowSeconds - 60 }), NOW)).toBe(true);
  });

  it("is true within the 30-second skew before exp", () => {
    expect(isAccessTokenExpired(jwt({ exp: nowSeconds + 10 }), NOW)).toBe(true);
  });

  it("is false while the token is comfortably valid", () => {
    expect(isAccessTokenExpired(jwt({ exp: nowSeconds + 600 }), NOW)).toBe(false);
  });

  it("treats unreadable tokens and a missing exp as not expired", () => {
    expect(isAccessTokenExpired("token-123", NOW)).toBe(false);
    expect(isAccessTokenExpired("a.%%%.c", NOW)).toBe(false);
    expect(isAccessTokenExpired(jwt({ sub: "u1" }), NOW)).toBe(false);
  });
});
