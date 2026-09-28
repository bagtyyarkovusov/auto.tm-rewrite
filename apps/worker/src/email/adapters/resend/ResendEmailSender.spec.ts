import { describe, expect, it, vi } from "vitest";

import { EMAIL_SEND_FAILURE } from "../../domain/types";

import { classifyResendError } from "./classifyResendError";
import { ResendEmailSender, type ResendSendFn } from "./ResendEmailSender";

const email = { to: "buyer@example.com", subject: "s", text: "t", html: "<p>h</p>" };
const FROM = "AutoTM <no-reply@autotm.bagtyyar.dev>";

describe("ResendEmailSender", () => {
  it("sends from EMAIL_FROM with the idempotency key", async () => {
    const sendFn = vi.fn<ResendSendFn>(async () => ({ error: null }));

    const result = await new ResendEmailSender(sendFn, FROM).send(email, {
      idempotencyKey: "req-1",
    });

    expect(result).toEqual({ ok: true });
    expect(sendFn).toHaveBeenCalledWith({ from: FROM, ...email }, { idempotencyKey: "req-1" });
  });

  it("classifies an API error response", async () => {
    const sendFn: ResendSendFn = async () => ({
      error: { name: "validation_error", statusCode: 422 },
    });

    const result = await new ResendEmailSender(sendFn, FROM).send(email, {
      idempotencyKey: "req-1",
    });

    expect(result).toEqual({
      ok: false,
      reason: EMAIL_SEND_FAILURE.Rejected,
      cause: "validation_error",
    });
  });

  it("treats a thrown SDK call as retryable and drops its message", async () => {
    const sendFn: ResendSendFn = async () => {
      throw new Error("boom with buyer@example.com");
    };

    const result = await new ResendEmailSender(sendFn, FROM).send(email, {
      idempotencyKey: "req-1",
    });

    expect(result).toEqual({
      ok: false,
      reason: EMAIL_SEND_FAILURE.Retryable,
      cause: "sdk_threw",
    });
  });
});

describe("classifyResendError", () => {
  it.each([
    ["rate_limit_exceeded", 429],
    ["application_error", 500],
    ["internal_server_error", 500],
    ["concurrent_idempotent_requests", 409],
  ])("retries %s", (name, statusCode) => {
    expect(classifyResendError({ name, statusCode }).reason).toBe(EMAIL_SEND_FAILURE.Retryable);
  });

  it("retries a network fault (null status code)", () => {
    expect(classifyResendError({ name: "application_error", statusCode: null })).toEqual({
      ok: false,
      reason: EMAIL_SEND_FAILURE.Retryable,
      cause: "network_error",
    });
  });

  it.each([
    ["validation_error", 422],
    ["invalid_from_address", 403],
    ["invalid_api_key", 403],
    ["daily_quota_exceeded", 429],
    ["monthly_quota_exceeded", 429],
    ["invalid_idempotent_request", 409],
  ])("fails %s permanently", (name, statusCode) => {
    expect(classifyResendError({ name, statusCode }).reason).toBe(EMAIL_SEND_FAILURE.Rejected);
  });
});
