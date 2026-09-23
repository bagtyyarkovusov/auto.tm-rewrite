import { describe, expect, it } from "vitest";
import type { OtpRequest, SignInCodeChannel } from "../domain/OtpRequest";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { OtpSenderPort } from "../domain/ports/OtpSenderPort";
import type { EmailCodeSenderPort } from "../domain/ports/EmailCodeSenderPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import type { ReviewerOtpBypassConfig } from "../domain/ports/ReviewerOtpBypassConfig";
import type { ConstantTimeComparatorPort } from "../domain/ports/ConstantTimeComparatorPort";
import { RequestOtp } from "./RequestOtp";

const START = new Date("2026-09-23T12:00:00Z");

class FakeClock implements ClockPort {
  current = START;
  now(): Date { return this.current; }
  advance(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}

class FakeOtpRequestRepository implements OtpRequestRepository {
  records: OtpRequest[] = [];
  private idCounter = 0;
  constructor(private readonly clock: ClockPort) {}

  async create(input: {
    channel: SignInCodeChannel;
    destination: string;
    codeHash: string;
    expiresAt: Date;
    userId: string | null;
    ip: string;
  }): Promise<OtpRequest> {
    const record: OtpRequest = {
      id: `00000000-0000-4000-8000-${String(++this.idCounter).padStart(12, "0")}`,
      ...input,
      verifiedAt: null,
      attempts: 0,
      createdAt: this.clock.now(),
    };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<OtpRequest | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findLatestByDestination(
    channel: SignInCodeChannel,
    destination: string,
  ): Promise<OtpRequest | null> {
    return this.records
      .filter((record) => record.channel === channel && record.destination === destination)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  }

  async countByDestinationSince(
    channel: SignInCodeChannel,
    destination: string,
    since: Date,
  ): Promise<number> {
    return this.records.filter(
      (record) =>
        record.channel === channel &&
        record.destination === destination &&
        record.createdAt >= since,
    ).length;
  }

  async countByIpSince(ip: string, since: Date): Promise<number> {
    return this.records.filter(
      (record) => record.ip === ip && record.createdAt >= since,
    ).length;
  }

  async markVerified(): Promise<OtpRequest> { throw new Error("unused"); }
  async incrementAttempts(): Promise<OtpRequest> { throw new Error("unused"); }
}

class FakeOtpSender implements OtpSenderPort {
  sent: Array<{ phone: string; code: string }> = [];
  async send(phone: string, code: string): Promise<void> {
    this.sent.push({ phone, code });
  }
}

class FakeEmailCodeSender implements EmailCodeSenderPort {
  jobs: Array<{ requestId: string; email: string; code: string; locale: "ru" | "tk" | "en" }> = [];
  async enqueue(input: {
    requestId: string;
    email: string;
    code: string;
    locale: "ru" | "tk" | "en";
  }): Promise<void> {
    this.jobs.push(input);
  }
}

const comparator: ConstantTimeComparatorPort = {
  compare: (candidate, expected) => candidate === expected,
};
const noReviewers: ReviewerOtpBypassConfig = { enabled: false, accounts: [] };

function harness(options: {
  testMode?: boolean;
  reviewerConfig?: ReviewerOtpBypassConfig;
} = {}) {
  const clock = new FakeClock();
  const repo = new FakeOtpRequestRepository(clock);
  const sms = new FakeOtpSender();
  const email = new FakeEmailCodeSender();
  const useCase = new RequestOtp(
    repo,
    sms,
    clock,
    options.testMode ?? false,
    email,
    options.reviewerConfig ?? noReviewers,
    comparator,
  );
  return { clock, repo, sms, email, useCase };
}

function reviewerConfig(): ReviewerOtpBypassConfig {
  return {
    enabled: true,
    accounts: [{
      phone: "+99365000001",
      email: "reviewer1@autotm.bagtyyar.dev",
      code: "111111",
    }],
  };
}

describe("RequestOtp", () => {
  it("preserves the phone request path and five-minute expiry", async () => {
    const { useCase, repo, sms, email } = harness();
    const result = await useCase.execute({ phone: "+99361234567", ip: "127.0.0.1" });

    expect(result.resendInSeconds).toBe(60);
    expect(repo.records[0]).toMatchObject({
      channel: "phone",
      destination: "+99361234567",
    });
    expect(repo.records[0]!.expiresAt).toEqual(new Date(START.getTime() + 5 * 60_000));
    expect(repo.records[0]!.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sms.sent).toHaveLength(1);
    expect(email.jobs).toHaveLength(0);
  });

  it("normalizes email, stores a ten-minute request, and enqueues the plaintext code", async () => {
    const { useCase, repo, sms, email } = harness();
    await useCase.execute({ email: "  Buyer@Example.COM ", ip: "127.0.0.1" });

    expect(repo.records[0]).toMatchObject({ channel: "email", destination: "buyer@example.com" });
    expect(repo.records[0]!.expiresAt).toEqual(new Date(START.getTime() + 10 * 60_000));
    expect(repo.records[0]!.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(repo.records[0]!.codeHash).not.toBe(email.jobs[0]!.code);
    expect(email.jobs[0]).toMatchObject({
      requestId: repo.records[0]!.id,
      email: "buyer@example.com",
      locale: "ru",
    });
    expect(email.jobs[0]!.code).toMatch(/^\d{6}$/);
    expect(sms.sent).toHaveLength(0);
  });

  it("enforces backoff and returns the next cooldown after an accepted retry", async () => {
    const { useCase, clock } = harness();
    const input = { email: "buyer@example.com", ip: "127.0.0.1" };

    await expect(useCase.execute(input)).resolves.toMatchObject({ resendInSeconds: 60 });
    await expect(useCase.execute(input)).rejects.toThrow("Too many OTP requests");
    clock.advance(60);
    await expect(useCase.execute(input)).resolves.toMatchObject({ resendInSeconds: 120 });
  });

  it("limits each normalized destination to five requests per 24 hours", async () => {
    const { useCase, clock } = harness();
    const input = { email: "buyer@example.com", ip: "127.0.0.1" };

    for (const wait of [0, 60, 120, 240, 480]) {
      if (wait > 0) clock.advance(wait);
      await useCase.execute(input);
    }
    clock.advance(960);
    await expect(useCase.execute(input)).rejects.toThrow("Too many OTP requests");
  });

  it("shares the ten-request IP budget across phone and email", async () => {
    const { useCase } = harness();
    for (let index = 0; index < 10; index++) {
      if (index % 2 === 0) {
        await useCase.execute({
          phone: `+9936${String(1000000 + index).slice(-7)}`,
          ip: "10.0.0.1",
        });
      } else {
        await useCase.execute({ email: `buyer${index}@example.com`, ip: "10.0.0.1" });
      }
    }

    await expect(
      useCase.execute({ email: "eleventh@example.com", ip: "10.0.0.1" }),
    ).rejects.toThrow("Too many OTP requests");
  });

  it("keeps reserved phones issuance-free and rate-limit exempt", async () => {
    const { useCase, repo, sms, email } = harness({ reviewerConfig: reviewerConfig() });
    for (let index = 0; index < 12; index++) {
      await useCase.execute({ phone: "+99365000001", ip: "10.0.0.1" });
    }
    expect(repo.records).toHaveLength(0);
    expect(sms.sent).toHaveLength(0);
    expect(email.jobs).toHaveLength(0);
  });

  it("stores and rate-limits reserved emails without enqueueing a hard bounce", async () => {
    const { useCase, repo, email, clock } = harness({ reviewerConfig: reviewerConfig() });
    const input = { email: "reviewer1@autotm.bagtyyar.dev", ip: "10.0.0.1" };

    for (const wait of [0, 60, 120, 240, 480]) {
      if (wait > 0) clock.advance(wait);
      await useCase.execute(input);
    }
    clock.advance(960);
    await expect(useCase.execute(input)).rejects.toThrow("Too many OTP requests");
    expect(repo.records).toHaveLength(5);
    expect(email.jobs).toHaveLength(0);
  });

  it("returns the code only in test mode", async () => {
    const enabled = harness({ testMode: true });
    const disabled = harness();
    await expect(
      enabled.useCase.execute({ email: "one@example.com", ip: "127.0.0.1" }),
    ).resolves.toMatchObject({ testCode: expect.stringMatching(/^\d{6}$/) });
    await expect(
      disabled.useCase.execute({ email: "two@example.com", ip: "127.0.0.1" }),
    ).resolves.not.toHaveProperty("testCode");
  });
});
