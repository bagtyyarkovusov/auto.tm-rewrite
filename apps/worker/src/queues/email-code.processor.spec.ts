import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { UnrecoverableError, type Job } from "bullmq";
import { AuthSchemas } from "@auto-tm/contracts";

import { InMemoryDailySendCap } from "../email/adapters/InMemoryDailySendCap";
import { MockEmailSender } from "../email/adapters/MockEmailSender";
import { SendSignInCodeEmail } from "../email/application/SendSignInCodeEmail";
import { EMAIL_SEND_FAILURE } from "../email/domain/types";

import { EmailCodeProcessor, maskEmail } from "./email-code.processor";

const CODE = "481529";

function makeJob(
  id: string | undefined,
  data: unknown = { to: "buyer@example.com", code: CODE, locale: "en", purpose: "sign-in" },
  name: string = AuthSchemas.EMAIL_CODE_JOB_NAME,
  attemptsMade = 0,
): Job {
  return { id, name, data, attemptsMade } as unknown as Job;
}

describe("EmailCodeProcessor", () => {
  let sender: MockEmailSender;
  let processor: EmailCodeProcessor;
  let logged: string[];

  function build(cap = 80): void {
    sender = new MockEmailSender();
    processor = new EmailCodeProcessor(
      new SendSignInCodeEmail(sender, new InMemoryDailySendCap(cap)),
    );
  }

  beforeEach(() => {
    logged = [];
    for (const level of ["log", "warn", "error", "debug", "verbose"] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
        logged.push(JSON.stringify(args));
      });
    }
    build();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Nothing a job run logs may contain the Sign-in Code.
    for (const line of logged) expect(line).not.toContain(CODE);
  });

  async function failureOf(job: Job): Promise<Error> {
    const error = await processor.process(job).then(
      () => undefined,
      (caught: unknown) => caught as Error,
    );
    if (error === undefined) throw new Error("expected the job to fail");
    expect(error.message).not.toContain(CODE);
    return error;
  }

  it("sends the rendered sign-in code email", async () => {
    await processor.process(makeJob("req-1"));

    expect(sender.sends).toHaveLength(1);
    const [send] = sender.sends;
    const email = send?.email;
    expect(email?.to).toBe("buyer@example.com");
    expect(email?.subject).toContain(CODE);
    expect(email?.text).toContain(CODE);
    expect(logged.some((line) => line.includes("b***@example.com"))).toBe(true);
  });

  it("uses the job ID as the idempotency key, so a retried job sends once", async () => {
    await processor.process(makeJob("req-1"));
    await processor.process(makeJob("req-1", undefined, undefined, 1));

    expect(sender.sends).toHaveLength(1);
    expect(sender.sends[0]?.options.idempotencyKey).toBe("req-1");
  });

  it("fails permanently, without retry, when the provider rejects the send", async () => {
    sender.setResult({ ok: false, reason: EMAIL_SEND_FAILURE.Rejected, cause: "validation_error" });

    const error = await failureOf(makeJob("req-1"));

    expect(error).toBeInstanceOf(UnrecoverableError);
    expect(error.message).toContain("validation_error");
  });

  it("fails retryably on a transient provider failure", async () => {
    sender.setResult({ ok: false, reason: EMAIL_SEND_FAILURE.Retryable, cause: "network_error" });

    const error = await failureOf(makeJob("req-1"));

    expect(error).not.toBeInstanceOf(UnrecoverableError);
  });

  it("stops sending and raises an alert once the daily cap is reached", async () => {
    build(2);
    await processor.process(makeJob("req-1"));
    await processor.process(makeJob("req-2"));

    const error = await failureOf(makeJob("req-3"));

    expect(error).toBeInstanceOf(UnrecoverableError);
    expect(sender.sends).toHaveLength(2);
    expect(logged.some((line) => line.includes("EMAIL_DAILY_CAP_REACHED"))).toBe(true);
  });

  it("lets a retried job keep its cap slot on a full day", async () => {
    build(1);
    sender.setResult({ ok: false, reason: EMAIL_SEND_FAILURE.Retryable, cause: "network_error" });
    await failureOf(makeJob("req-1"));
    sender.setResult({ ok: true });

    await processor.process(makeJob("req-1", undefined, undefined, 1));

    expect(sender.sends.filter((send) => send.result.ok)).toHaveLength(1);
  });

  it("fails permanently on an invalid payload without logging its values", async () => {
    const error = await failureOf(
      makeJob("req-1", { to: "not-an-email", code: CODE, locale: "en", purpose: "sign-in" }),
    );

    expect(error).toBeInstanceOf(UnrecoverableError);
    expect(error.message).toContain("to");
    expect(sender.sends).toHaveLength(0);
  });

  it("fails permanently on a job without an ID or with an unknown name", async () => {
    expect(await failureOf(makeJob(undefined))).toBeInstanceOf(UnrecoverableError);
    expect(await failureOf(makeJob("req-1", undefined, "other"))).toBeInstanceOf(
      UnrecoverableError,
    );
    expect(sender.sends).toHaveLength(0);
  });
});

describe("maskEmail", () => {
  it("keeps the first character and the domain", () => {
    expect(maskEmail("buyer@example.com")).toBe("b***@example.com");
    expect(maskEmail("nope")).toBe("***");
  });
});
