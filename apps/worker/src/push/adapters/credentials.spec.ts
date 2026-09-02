import { describe, expect, it } from "vitest";

import { readApnsCredentials, readFcmCredentials } from "./credentials";

const PEM_BODY = "MIIEvQIBADANBgkqhkiG9w0BAQEFAASC";
const REAL_PEM = `-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n-----END PRIVATE KEY-----`;
const ESCAPED_PEM = `-----BEGIN PRIVATE KEY-----\\n${PEM_BODY}\\n-----END PRIVATE KEY-----\\n`;

describe("credential readers", () => {
  const env: Record<string, string> = {
    FCM_PROJECT_ID: "autotm",
    FCM_CLIENT_EMAIL: "push@autotm.iam.gserviceaccount.com",
    FCM_PRIVATE_KEY: ESCAPED_PEM,
    APNS_KEY_ID: "ABCD1234",
    APNS_TEAM_ID: "TEAM1234",
    APNS_BUNDLE_ID: "tm.auto.app",
    APNS_PRIVATE_KEY: ESCAPED_PEM,
    APNS_PRODUCTION: "true",
  };
  const read = (name: string) => env[name];

  it("reads and normalizes FCM credentials", () => {
    expect(readFcmCredentials(read)).toEqual({
      projectId: "autotm",
      clientEmail: "push@autotm.iam.gserviceaccount.com",
      privateKey: `${REAL_PEM}\n`,
    });
  });

  it("reads the APNS host from APNS_PRODUCTION, not APP_ENV", () => {
    expect(readApnsCredentials(read)).toEqual({
      keyId: "ABCD1234",
      teamId: "TEAM1234",
      bundleId: "tm.auto.app",
      privateKey: `${REAL_PEM}\n`,
      production: true,
    });

    const sandbox = (name: string) =>
      name === "APNS_PRODUCTION" ? "false" : env[name];
    expect(readApnsCredentials(sandbox).production).toBe(false);
  });

  it("requires APNS_PRODUCTION to be stated explicitly", () => {
    const missing = (name: string) =>
      name === "APNS_PRODUCTION" ? undefined : env[name];

    expect(() => readApnsCredentials(missing)).toThrow(/APNS_PRODUCTION/);
  });

  it("reports the missing variable by name", () => {
    const partial = (name: string) =>
      name === "APNS_TEAM_ID" ? undefined : env[name];

    expect(() => readApnsCredentials(partial)).toThrow(/APNS_TEAM_ID/);
  });
});
