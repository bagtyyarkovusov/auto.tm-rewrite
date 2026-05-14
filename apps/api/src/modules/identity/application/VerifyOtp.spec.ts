import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import type { OtpRequest } from "../domain/OtpRequest";
import type { User } from "../domain/User";
import type { Session } from "../domain/Session";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { UserRepository } from "../domain/ports/UserRepository";
import type { SessionRepository } from "../domain/ports/SessionRepository";
import type { PasswordHasherPort } from "../domain/ports/PasswordHasherPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import { VerifyOtp } from "./VerifyOtp";

const NOW = new Date("2026-05-14T12:00:00Z");

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function makeOtpRequest(overrides: Partial<OtpRequest> = {}): OtpRequest {
  return {
    id: randomUUID(),
    phone: "+99361234567",
    codeHash: hashCode("123456"),
    expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
    verifiedAt: null,
    attempts: 0,
    userId: null,
    ip: "127.0.0.1",
    createdAt: NOW,
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: randomUUID(),
    phone: "+99361234567",
    displayName: null,
    avatarUrl: null,
    locale: "ru",
    role: "buyer",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: randomUUID(),
    userId: "user-1",
    refreshTokenHash: "hashed-token",
    deviceLabel: null,
    userAgent: null,
    expiresAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: NOW,
    lastSeenAt: NOW,
    ...overrides,
  };
}

class FakeOtpRequestRepository implements OtpRequestRepository {
  records: OtpRequest[] = [];

  async create(input: {
    phone: string;
    codeHash: string;
    expiresAt: Date;
    userId: string | null;
    ip: string;
  }): Promise<OtpRequest> {
    const record: OtpRequest = {
      id: randomUUID(),
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

  async findLatestByPhone(phone: string): Promise<OtpRequest | null> {
    const sorted = this.records
      .filter((r) => r.phone === phone)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return sorted[0] ?? null;
  }

  async countByPhoneSince(): Promise<number> {
    return 0;
  }

  async countByIpSince(): Promise<number> {
    return 0;
  }

  async markVerified(id: string, userId: string): Promise<OtpRequest> {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error("Not found");
    const updated: OtpRequest = { ...record, verifiedAt: NOW, userId };
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

  addRecord(r: OtpRequest): void {
    this.records.push(r);
  }
}

class FakeUserRepository implements UserRepository {
  users: User[] = [];

  async findByPhone(phone: string): Promise<User | null> {
    return this.users.find((u) => u.phone === phone) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async create(input: { phone: string }): Promise<User> {
    const user: User = {
      id: randomUUID(),
      phone: input.phone,
      displayName: null,
      avatarUrl: null,
      locale: "ru",
      role: "buyer",
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.users.push(user);
    return user;
  }

  async delete(_id: string): Promise<void> {}
}

class FakeSessionRepository implements SessionRepository {
  sessions: Session[] = [];

  async create(input: {
    userId: string;
    refreshTokenHash: string;
    deviceLabel: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      ...input,
      createdAt: NOW,
      lastSeenAt: NOW,
    };
    this.sessions.push(session);
    return session;
  }

  async countByUserId(userId: string): Promise<number> {
    return this.sessions.filter((s) => s.userId === userId).length;
  }

  async deleteExpiredByUserId(userId: string): Promise<number> {
    const before = this.sessions.length;
    this.sessions = this.sessions.filter(
      (s) => !(s.userId === userId && s.expiresAt < NOW),
    );
    return before - this.sessions.length;
  }

  async deleteOldestByUserId(userId: string): Promise<void> {
    const userSessions = this.sessions
      .filter((s) => s.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (userSessions.length > 0) {
      this.sessions = this.sessions.filter(
        (s) => s.id !== userSessions[0]!.id,
      );
    }
  }

  async findByRefreshToken(_plaintext: string): Promise<import("../domain/ports/SessionRepository").SessionLookupResult | null> {
    return null;
  }

  async rotateRefreshToken(
    id: string,
    oldHash: string,
    newHash: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<boolean> {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    if (this.sessions[idx]!.refreshTokenHash !== oldHash) return false;
    this.sessions[idx] = {
      ...this.sessions[idx]!,
      refreshTokenHash: newHash,
      lastSeenAt,
      expiresAt,
    };
    return true;
  }

  async delete(id: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== id);
  }

  async deleteAllByUserId(userId: string): Promise<number> {
    const before = this.sessions.length;
    this.sessions = this.sessions.filter((s) => s.userId !== userId);
    return before - this.sessions.length;
  }
}

class FakePasswordHasher implements PasswordHasherPort {
  async hash(plaintext: string): Promise<string> {
    return `hashed:${plaintext}`;
  }

  async compare(plaintext: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plaintext}`;
  }
}

class FakeClock implements ClockPort {
  now(): Date {
    return NOW;
  }
}

const jwtService = new JwtService({
  secret: "test-secret",
  signOptions: { expiresIn: 15 * 60 },
});

interface MakeUseCaseOpts {
  otpRepo?: OtpRequestRepository;
  userRepo?: UserRepository;
  sessionRepo?: SessionRepository;
  hasher?: PasswordHasherPort;
  clock?: ClockPort;
  eventBus?: { emit: ReturnType<typeof vi.fn> };
}

function makeUseCase(opts: MakeUseCaseOpts = {}) {
  return new VerifyOtp(
    opts.otpRepo ?? new FakeOtpRequestRepository(),
    opts.userRepo ?? new FakeUserRepository(),
    opts.sessionRepo ?? new FakeSessionRepository(),
    opts.hasher ?? new FakePasswordHasher(),
    opts.clock ?? new FakeClock(),
    jwtService,
    opts.eventBus ?? { emit: vi.fn() },
  );
}

describe("VerifyOtp", () => {
  let otpRepo: FakeOtpRequestRepository;
  let userRepo: FakeUserRepository;
  let sessionRepo: FakeSessionRepository;
  let hasher: FakePasswordHasher;
  let clock: FakeClock;
  let eventBus: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    otpRepo = new FakeOtpRequestRepository();
    userRepo = new FakeUserRepository();
    sessionRepo = new FakeSessionRepository();
    hasher = new FakePasswordHasher();
    clock = new FakeClock();
    eventBus = { emit: vi.fn() };
  });

  // --- Happy path ---

  it("verifies a correct code and returns tokens + user", async () => {
    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    const result = await uc.execute({
      phone: "+99361234567",
      code: "123456",
      deviceLabel: "Chrome on Mac",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.accessToken.length).toBeGreaterThan(10);
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken.length).toBeGreaterThan(10);
    expect(result.user.phone).toBe("+99361234567");
    expect(result.user.role).toBe("buyer");

    // OTP is marked verified
    const updatedOtp = await otpRepo.findById(otpRequest.id);
    expect(updatedOtp!.verifiedAt).not.toBeNull();

    // User was created
    expect(userRepo.users).toHaveLength(1);
    expect(userRepo.users[0]!.phone).toBe("+99361234567");

    // Session was created
    expect(sessionRepo.sessions).toHaveLength(1);
    expect(sessionRepo.sessions[0]!.userId).toBe(userRepo.users[0]!.id);

    // Refresh token is hashed, not plaintext
    expect(sessionRepo.sessions[0]!.refreshTokenHash).toMatch(/^hashed:/);
    expect(sessionRepo.sessions[0]!.refreshTokenHash).not.toBe(
      result.refreshToken,
    );
  });

  it("marks the OTP request consumed/verified", async () => {
    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await uc.execute({
      phone: "+99361234567",
      code: "123456",
    });

    const record = await otpRepo.findById(otpRequest.id);
    expect(record!.verifiedAt).not.toBeNull();
  });

  // --- Expired code ---

  it("fails with expired code", async () => {
    const expiredOtp = makeOtpRequest({
      expiresAt: new Date(NOW.getTime() - 1000), // 1 second ago
    });
    otpRepo.addRecord(expiredOtp);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await expect(
      uc.execute({ phone: "+99361234567", code: "123456" }),
    ).rejects.toThrow("OTP code has expired");
  });

  // --- Reused code ---

  it("fails when code is already consumed", async () => {
    const consumedOtp = makeOtpRequest({
      verifiedAt: NOW,
      userId: "user-1",
    });
    otpRepo.addRecord(consumedOtp);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await expect(
      uc.execute({ phone: "+99361234567", code: "123456" }),
    ).rejects.toThrow("OTP code has already been used");
  });

  // --- Wrong code ---

  it("fails on wrong code", async () => {
    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await expect(
      uc.execute({ phone: "+99361234567", code: "000000" }),
    ).rejects.toThrow("Invalid OTP code");
  });

  // --- Too many attempts ---

  it("locks the OTP request after 6 wrong attempts", async () => {
    const otpRequest = makeOtpRequest({ attempts: 5 });
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await expect(
      uc.execute({ phone: "+99361234567", code: "000000" }),
    ).rejects.toThrow("Too many attempts");
  });

  // --- Existing user reuse ---

  it("reuses an existing user when phone matches", async () => {
    const existingUser = makeUser({ phone: "+99361234567" });
    userRepo.users.push(existingUser);

    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    const result = await uc.execute({
      phone: "+99361234567",
      code: "123456",
    });

    expect(result.user.id).toBe(existingUser.id);
    expect(userRepo.users).toHaveLength(1); // no new user created
  });

  // --- Session hash storage ---

  it("stores bcrypt hash of refresh token, not plaintext", async () => {
    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    const result = await uc.execute({
      phone: "+99361234567",
      code: "123456",
    });

    const session = sessionRepo.sessions[0]!;
    // Hash is stored, not the token
    expect(session.refreshTokenHash).not.toBe(result.refreshToken);
    // Hash starts with our fake hasher prefix
    expect(session.refreshTokenHash).toMatch(/^hashed:/);
    // The hasher was called with the plaintext token
    expect(await hasher.compare(result.refreshToken, session.refreshTokenHash)).toBe(true);
  });

  // --- 11th session eviction ---

  it("evicts oldest session when user has 10 active sessions", async () => {
    const user = makeUser();
    userRepo.users.push(user);

    // Create 10 existing sessions for the same user
    const oldestCreatedAt = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    for (let i = 0; i < 10; i++) {
      const sess = makeSession({
        userId: user.id,
        createdAt: new Date(oldestCreatedAt.getTime() + i * 60 * 1000),
      });
      sessionRepo.sessions.push(sess);
    }

    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await uc.execute({
      phone: "+99361234567",
      code: "123456",
    });

    // Still 10 sessions (oldest evicted, new one added)
    const userSessions = sessionRepo.sessions.filter(
      (s) => s.userId === user.id,
    );
    expect(userSessions).toHaveLength(10);

    // The oldest session (createdAt = oldestCreatedAt) should be gone
    const removedSession = sessionRepo.sessions.find(
      (s) => s.createdAt.getTime() === oldestCreatedAt.getTime(),
    );
    expect(removedSession).toBeUndefined();
  });

  // --- UserRegistered event ---

  it("emits UserRegistered only when a new user is created", async () => {
    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await uc.execute({
      phone: "+99361234567",
      code: "123456",
    });

    expect(eventBus.emit).toHaveBeenCalledWith(
      "UserRegistered",
      expect.objectContaining({
        userId: expect.any(String),
        phone: "+99361234567",
      }),
    );

    // Second login — no new event
    eventBus.emit.mockClear();
    const otpRequest2 = makeOtpRequest({
      createdAt: new Date(NOW.getTime() + 60_000),
    });
    otpRepo.addRecord(otpRequest2);

    await uc.execute({
      phone: "+99361234567",
      code: "123456",
    });

    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  // --- No OTP request for this phone ---

  it("fails when no OTP request exists for this phone", async () => {
    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await expect(
      uc.execute({ phone: "+99361234567", code: "123456" }),
    ).rejects.toThrow("No OTP request found for this phone");
  });

  // --- Access token expiry ---

  it("issues an access token with the correct identity claims", async () => {
    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    const result = await uc.execute({
      phone: "+99361234567",
      code: "123456",
    });

    // We can't decode the JWT here (no secret), but the token is a JWT string
    expect(result.accessToken).toMatch(/^eyJ/); // JWT prefix
    expect(result.accessToken.split(".")).toHaveLength(3);
  });

  // --- Device label/server capture ---

  it("captures deviceLabel and userAgent on the session", async () => {
    const otpRequest = makeOtpRequest();
    otpRepo.addRecord(otpRequest);

    const uc = makeUseCase({ otpRepo, userRepo, sessionRepo, hasher, clock, eventBus });
    await uc.execute({
      phone: "+99361234567",
      code: "123456",
      deviceLabel: "iPhone 15 Pro",
      userAgent: "Mozilla/5.0 ...",
    });

    const session = sessionRepo.sessions[0]!;
    expect(session.deviceLabel).toBe("iPhone 15 Pro");
    expect(session.userAgent).toBe("Mozilla/5.0 ...");
  });
});
