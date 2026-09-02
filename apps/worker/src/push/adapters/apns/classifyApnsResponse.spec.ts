import { describe, expect, it } from "vitest";

import { PUSH_RESULT_REASON } from "../../domain/types";

import { classifyApnsResponse } from "./classifyApnsResponse";

const DEVICE = "a9d0ed10e9cfd022a61cb08753f49c5a";

function rejected(status: number, reason?: string) {
  return {
    sent: [],
    failed: [
      {
        device: DEVICE,
        status,
        ...(reason ? { response: { reason } } : {}),
      },
    ],
  };
}

describe("classifyApnsResponse", () => {
  it("reports success when the device is in the sent list", () => {
    expect(
      classifyApnsResponse({ sent: [{ device: DEVICE }], failed: [] }),
    ).toEqual({ ok: true });
  });

  it("treats 410 Unregistered as an invalid token", () => {
    expect(classifyApnsResponse(rejected(410, "Unregistered"))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.InvalidToken,
    });
  });

  it("treats 400 BadDeviceToken as an invalid token", () => {
    expect(classifyApnsResponse(rejected(400, "BadDeviceToken"))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.InvalidToken,
    });
  });

  it.each([
    [429, "TooManyRequests"],
    [503, "ServiceUnavailable"],
    [500, "InternalServerError"],
    [403, "ExpiredProviderToken"],
  ])("treats %i %s as retryable", (status, reason) => {
    expect(classifyApnsResponse(rejected(status, reason))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Retryable,
      cause: reason,
    });
  });

  it.each([
    [400, "DeviceTokenNotForTopic"],
    [403, "InvalidProviderToken"],
    [413, "PayloadTooLarge"],
    [400, "TopicDisallowed"],
  ])("treats %i %s as a permanent failure", (status, reason) => {
    expect(classifyApnsResponse(rejected(status, reason))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: reason,
    });
  });

  it("keeps a configuration rejection from deactivating the device token", () => {
    const result = classifyApnsResponse(rejected(400, "DeviceTokenNotForTopic"));

    expect(result).not.toMatchObject({
      reason: PUSH_RESULT_REASON.InvalidToken,
    });
  });

  it("treats a connection error without a status as retryable", () => {
    expect(
      classifyApnsResponse({
        sent: [],
        failed: [{ device: DEVICE, error: new Error("Network timeout") }],
      }),
    ).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Retryable,
      cause: "apns/connection-error",
    });
  });

  it("falls back to the status when APNS omits a reason", () => {
    expect(classifyApnsResponse(rejected(400))).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: "status-400",
    });
  });

  it("treats an empty response as a permanent failure", () => {
    expect(classifyApnsResponse({ sent: [], failed: [] })).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: "apns/empty-response",
    });
  });
});
