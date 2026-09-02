import { describe, expect, it } from "vitest";

import { PUSH_RESULT_REASON } from "../../domain/types";

import { classifyFcmError } from "./classifyFcmError";

function fcmError(code: string): Error & { code: string } {
  return Object.assign(new Error(`firebase failure: ${code}`), { code });
}

describe("classifyFcmError", () => {
  it.each([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
    "messaging/installation-id-not-registered",
    "messaging/invalid-recipient",
  ])("treats %s as an invalid token", (code) => {
    expect(classifyFcmError(fcmError(code))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.InvalidToken,
    });
  });

  it.each([
    "messaging/server-unavailable",
    "messaging/internal-error",
    "messaging/unknown-error",
    "messaging/message-rate-exceeded",
    "messaging/device-message-rate-exceeded",
    "messaging/quota-exceeded",
    "app/network-error",
  ])("treats %s as retryable", (code) => {
    expect(classifyFcmError(fcmError(code))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Retryable,
      cause: code,
    });
  });

  it.each([
    "messaging/authentication-error",
    "messaging/mismatched-credential",
    "messaging/invalid-payload",
    "messaging/third-party-auth-error",
    "messaging/invalid-package-name",
  ])("treats %s as a permanent failure", (code) => {
    expect(classifyFcmError(fcmError(code))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: code,
    });
  });

  it("keeps ambiguous invalid-argument permanent so payload bugs cannot deactivate devices", () => {
    expect(classifyFcmError(fcmError("messaging/invalid-argument"))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: "messaging/invalid-argument",
    });
  });

  it("treats a codeless throw as retryable rather than a token verdict", () => {
    expect(classifyFcmError(new Error("socket hang up"))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Retryable,
      cause: "fcm/no-error-code",
    });
  });

  it.each([[null], [undefined], ["boom"], [42]])(
    "classifies non-object rejection %s as retryable",
    (thrown) => {
      expect(classifyFcmError(thrown)).toMatchObject({
        ok: false,
        reason: PUSH_RESULT_REASON.Retryable,
      });
    },
  );

  it("never carries the provider error object into the result", () => {
    const error = Object.assign(new Error("leaky"), {
      code: "messaging/internal-error",
      privateKey: "-----BEGIN PRIVATE KEY-----secret",
    });

    const result = classifyFcmError(error);

    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("BEGIN PRIVATE KEY");
  });
});
