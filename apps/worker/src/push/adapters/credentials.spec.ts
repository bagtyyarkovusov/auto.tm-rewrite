import { describe, expect, it } from "vitest";

import {
  InvalidPushCredentialError,
  normalizePrivateKey,
  readApnsCredentials,
  readFcmCredentials,
} from "./credentials";

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
      InvalidPushCredentialError,
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

describe("credential readers", () => {
  const env: Record<string, string> = {
    FCM_PROJECT_ID: "autotm",
    FCM_CLIENT_EMAIL: "push@autotm.iam.gserviceaccount.com",
    FCM_PRIVATE_KEY: ESCAPED_PEM,
    APNS_KEY_ID: "ABCD1234",
    APNS_TEAM_ID: "TEAM1234",
    APNS_BUNDLE_ID: "tm.auto.app",
    APNS_PRIVATE_KEY: ESCAPED_PEM,
  };
  const read = (name: string) => env[name];

  it("reads and normalizes FCM credentials", () => {
    expect(readFcmCredentials(read)).toEqual({
      projectId: "autotm",
      clientEmail: "push@autotm.iam.gserviceaccount.com",
      privateKey: `${REAL_PEM}\n`,
    });
  });

  it("reads APNS credentials and carries the production flag", () => {
    expect(readApnsCredentials(read, true)).toEqual({
      keyId: "ABCD1234",
      teamId: "TEAM1234",
      bundleId: "tm.auto.app",
      privateKey: `${REAL_PEM}\n`,
      production: true,
    });
    expect(readApnsCredentials(read, false).production).toBe(false);
  });

  it("reports the missing variable by name", () => {
    const partial = (name: string) =>
      name === "APNS_TEAM_ID" ? undefined : env[name];

    expect(() => readApnsCredentials(partial, false)).toThrow(/APNS_TEAM_ID/);
  });
});
