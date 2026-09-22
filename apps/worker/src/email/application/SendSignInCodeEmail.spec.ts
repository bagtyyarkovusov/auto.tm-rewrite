import { describe, expect, it } from "vitest";

import { InMemoryDailySendCap } from "../adapters/InMemoryDailySendCap";
import { MockEmailSender } from "../adapters/MockEmailSender";
import { EMAIL_SEND_FAILURE, SEND_SIGN_IN_CODE_OUTCOME } from "../domain/types";

import { SendSignInCodeEmail } from "./SendSignInCodeEmail";

const input = {
  jobId: "req-1",
  to: "buyer@example.com",
  code: "123456",
  locale: "tk",
  purpose: "account-deletion",
} as const;
const now = new Date("2026-09-22T12:00:00Z");

function build(cap = 80) {
  const sender = new MockEmailSender();
  return { sender, useCase: new SendSignInCodeEmail(sender, new InMemoryDailySendCap(cap)) };
}

describe("SendSignInCodeEmail", () => {
  it("renders the email in the job's locale and sends it under the job ID", async () => {
    const { sender, useCase } = build();

    expect(await useCase.execute(input, now)).toEqual({ status: SEND_SIGN_IN_CODE_OUTCOME.Sent });
    expect(sender.sends[0]?.options).toEqual({ idempotencyKey: "req-1" });
    expect(sender.sends[0]?.email.text).toContain("hasabyňyzy pozmagy");
  });

  it("maps provider failures to rejected or retryable", async () => {
    const { sender, useCase } = build();

    sender.setResult({ ok: false, reason: EMAIL_SEND_FAILURE.Rejected, cause: "validation_error" });
    expect(await useCase.execute(input, now)).toEqual({
      status: SEND_SIGN_IN_CODE_OUTCOME.Rejected,
      cause: "validation_error",
    });

    sender.setResult({ ok: false, reason: EMAIL_SEND_FAILURE.Retryable, cause: "network_error" });
    expect(await useCase.execute({ ...input, jobId: "req-2" }, now)).toEqual({
      status: SEND_SIGN_IN_CODE_OUTCOME.Retryable,
      cause: "network_error",
    });
  });

  it("checks the daily cap before calling the provider", async () => {
    const { sender, useCase } = build(1);
    await useCase.execute(input, now);

    expect(await useCase.execute({ ...input, jobId: "req-2" }, now)).toEqual({
      status: SEND_SIGN_IN_CODE_OUTCOME.CapReached,
      cap: 1,
    });
    expect(sender.sends).toHaveLength(1);
  });

  it("starts a fresh cap on the next UTC day", async () => {
    const { useCase } = build(1);
    await useCase.execute(input, now);

    const nextDay = new Date("2026-09-23T00:00:01Z");
    expect(await useCase.execute({ ...input, jobId: "req-2" }, nextDay)).toEqual({
      status: SEND_SIGN_IN_CODE_OUTCOME.Sent,
    });
  });
});
