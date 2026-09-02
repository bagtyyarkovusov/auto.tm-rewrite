import { describe, expect, it } from "vitest";

import { InvalidPrivateKeyError, normalizePrivateKey } from "./pem";

const PEM_BODY = "MIIEvQIBADANBgkqhkiG9w0BAQEFAASC";
const REAL_PEM = `-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n-----END PRIVATE KEY-----`;
const ESCAPED_PEM = `-----BEGIN PRIVATE KEY-----\\n${PEM_BODY}\\n-----END PRIVATE KEY-----\\n`;

describe("normalizePrivateKey", () => {
  it("expands escaped newlines into a real PEM block", () => {
    const key = normalizePrivateKey("FCM_PRIVATE_KEY", ESCAPED_PEM);

    expect(key.split("\n")).toEqual([
      "-----BEGIN PRIVATE KEY-----",
      PEM_BODY,
      "-----END PRIVATE KEY-----",
      "",
    ]);
  });

  it("accepts an already multiline key unchanged", () => {
    expect(normalizePrivateKey("APNS_PRIVATE_KEY", REAL_PEM)).toBe(
      `${REAL_PEM}\n`,
    );
  });

  it("strips wrapping double and single quotes", () => {
    expect(normalizePrivateKey("FCM_PRIVATE_KEY", `"${ESCAPED_PEM}"`)).toBe(
      `${REAL_PEM}\n`,
    );
    expect(normalizePrivateKey("FCM_PRIVATE_KEY", `'${ESCAPED_PEM}'`)).toBe(
      `${REAL_PEM}\n`,
    );
  });

  it("normalizes escaped CRLF line endings", () => {
    const crlf = `-----BEGIN PRIVATE KEY-----\\r\\n${PEM_BODY}\\r\\n-----END PRIVATE KEY-----`;
    expect(normalizePrivateKey("APNS_PRIVATE_KEY", crlf)).toBe(`${REAL_PEM}\n`);
  });

  it("rejects a value that is not a PEM block", () => {
    expect(() => normalizePrivateKey("FCM_PRIVATE_KEY", "not-a-key")).toThrow(
      InvalidPrivateKeyError,
    );
  });

  it("rejects an empty value", () => {
    expect(() => normalizePrivateKey("FCM_PRIVATE_KEY", "   ")).toThrow(
      /FCM_PRIVATE_KEY is empty/,
    );
  });

  it("never includes key material in the error message", () => {
    const secret = `-----BEGIN PRIVATE KEY-----${PEM_BODY}`;
    try {
      normalizePrivateKey("APNS_PRIVATE_KEY", secret);
      expect.unreachable("expected a credential error");
    } catch (error) {
      expect(String(error)).not.toContain(PEM_BODY);
      expect(String(error)).toContain("APNS_PRIVATE_KEY");
    }
  });
});
