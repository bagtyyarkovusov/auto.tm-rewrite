import { describe, it, expect, beforeEach } from "vitest";
import type { OtpRequest } from "../domain/OtpRequest";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { OtpSenderPort } from "../domain/ports/OtpSenderPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import { RequestOtp } from "./RequestOtp";

const NOW = new Date("2026-05-14T12:00:00Z");

class FakeOtpRequestRepository implements OtpRequestRepository {
  records: OtpRequest[] = [];
  private idCounter = 0;

  async create(input: {
    phone: string;
    codeHash: string;
    expiresAt: Date;
    userId: string | null;
    ip: string;
  }): Promise<OtpRequest> {
    this.idCounter++;
    const record: OtpRequest = {
      id: `req-${this.idCounter}`,
      ...input,
      verifiedAt: null,
      attempts: 0,
      createdAt: NOW,
    };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<OtpRequest | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async countByPhoneSince(phone: string, since: Date): Promise<number> {
    return this.records.filter(
      (r) => r.phone === phone && r.createdAt >= since,
    ).length;
  }

  async countByIpSince(ip: string, since: Date): Promise<number> {
    return this.records.filter(
      (r) => r.ip === ip && r.createdAt >= since,
    ).length;
  }

  async findLatestByPhone(phone: string): Promise<OtpRequest | null> {
    const sorted = this.records
      .filter((r) => r.phone === phone)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return sorted[0] ?? null;
  }

  async markVerified(id: string, userId: string): Promise<OtpRequest> {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error("Not found");
    const updated: OtpRequest = { ...record, verifiedAt: new Date(), userId };
    this.records = this.records.map((r) => (r.id === id ? updated : r));
    return updated;
  }

  async incrementAttempts(id: string): Promise<OtpRequest> {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error("Not found");
    const updated: OtpRequest = { ...record, attempts: record.attempts + 1 };
    this.records = this.records.map((r) => (r.id === id ? updated : r));
    return updated;
  }
}

class FakeOtpSender implements OtpSenderPort {
  sent: Array<{ phone: string; code: string }> = [];

  async send(phone: string, code: string): Promise<void> {
    this.sent.push({ phone, code });
  }
}

class FakeClock implements ClockPort {
  now(): Date {
    return NOW;
  }
}

function makeUseCase(overrides: {
  repo?: OtpRequestRepository;
  sender?: OtpSenderPort;
  clock?: ClockPort;
  testMode?: boolean;
} = {}) {
  return new RequestOtp(
    overrides.repo ?? new FakeOtpRequestRepository(),
    overrides.sender ?? new FakeOtpSender(),
    overrides.clock ?? new FakeClock(),
    overrides.testMode ?? false,
  );
}

describe("RequestOtp", () => {
  let repo: FakeOtpRequestRepository;
  let sender: FakeOtpSender;

  beforeEach(() => {
    repo = new FakeOtpRequestRepository();
    sender = new FakeOtpSender();
  });

  it("creates an OTP request for a valid TM phone", async () => {
    const uc = makeUseCase({ repo, sender });
    const result = await uc.execute({ phone: "+99361234567", ip: "127.0.0.1" });

    expect(result.requestId).toBeDefined();
    expect(result.resendInSeconds).toBe(60);
    expect(repo.records).toHaveLength(1);
    expect(repo.records[0]!.phone).toBe("+99361234567");
    expect(repo.records[0]!.codeHash).toBeTruthy();
    expect(repo.records[0]!.codeHash).not.toBe("123456");
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]!.phone).toBe("+99361234567");
  });

  it("hashes the OTP code, never stores plaintext", async () => {
    const uc = makeUseCase({ repo, sender });
    const result = await uc.execute({ phone: "+99361234567", ip: "127.0.0.1" });

    const record = repo.records[0]!;
    // codeHash is a SHA-256 hex string (64 chars)
    expect(record.codeHash).toMatch(/^[a-f0-9]{64}$/);
    // Plaintext code is not in the record
    expect(record.codeHash).not.toBe("123456");
  });

  it("sends the plaintext code via the sender port", async () => {
    const uc = makeUseCase({ repo, sender });
    await uc.execute({ phone: "+99361234567", ip: "127.0.0.1" });

    expect(sender.sent[0]!.code).toMatch(/^\d{6}$/);
  });

  it("throws on invalid phone", async () => {
    const uc = makeUseCase({ repo, sender });
    await expect(
      uc.execute({ phone: "not-a-phone", ip: "127.0.0.1" }),
    ).rejects.toThrow("Phone must be +993[6-7]");
  });

  it("throws on non-TM phone", async () => {
    const uc = makeUseCase({ repo, sender });
    await expect(
      uc.execute({ phone: "+15551234567", ip: "127.0.0.1" }),
    ).rejects.toThrow("Phone must be +993[6-7]");
  });

  it("blocks when phone daily limit reached", async () => {
    // Pre-seed 5 requests for same phone
    for (let i = 0; i < 5; i++) {
      await repo.create({
        phone: "+99361234567",
        codeHash: "abc123",
        expiresAt: new Date(NOW.getTime() + 300_000),
        userId: null,
        ip: "127.0.0.1",
      });
    }

    const uc = makeUseCase({ repo });
    await expect(
      uc.execute({ phone: "+99361234567", ip: "127.0.0.1" }),
    ).rejects.toThrow("Too many OTP requests");
  });

  it("blocks when IP hourly limit reached", async () => {
    // Pre-seed 10 requests from same IP
    for (let i = 0; i < 10; i++) {
      await repo.create({
        phone: `+9936${String(i).padStart(7, "0")}`,
        codeHash: "abc123",
        expiresAt: new Date(NOW.getTime() + 300_000),
        userId: null,
        ip: "10.0.0.1",
      });
    }

    const uc = makeUseCase({ repo });
    await expect(
      uc.execute({ phone: "+99379999999", ip: "10.0.0.1" }),
    ).rejects.toThrow("Too many OTP requests");
  });

  it("enforces exponential backoff between requests", async () => {
    const uc = makeUseCase({ repo });
    // First request
    const r1 = await uc.execute({ phone: "+99361234567", ip: "127.0.0.1" });
    expect(r1.resendInSeconds).toBe(60);

    // Second request
    const r2 = await uc.execute({ phone: "+99361234567", ip: "127.0.0.1" });
    expect(r2.resendInSeconds).toBe(120);
  });

  it("returns testCode when test mode is enabled", async () => {
    const uc = makeUseCase({ repo, sender, testMode: true });
    const result = await uc.execute({ phone: "+99361234567", ip: "127.0.0.1" });

    expect(result.testCode).toBeDefined();
    expect(result.testCode).toMatch(/^\d{6}$/);
  });

  it("does NOT return testCode when test mode is disabled", async () => {
    const uc = makeUseCase({ repo, sender, testMode: false });
    const result = await uc.execute({ phone: "+99361234567", ip: "127.0.0.1" });

    expect(result.testCode).toBeUndefined();
  });

  it("sets OTP expiry to 5 minutes from now", async () => {
    const uc = makeUseCase({ repo, sender });
    await uc.execute({ phone: "+99361234567", ip: "127.0.0.1" });

    const record = repo.records[0]!;
    const expectedExpiry = new Date(NOW.getTime() + 5 * 60 * 1000);
    expect(record.expiresAt.getTime()).toBe(expectedExpiry.getTime());
  });
});
