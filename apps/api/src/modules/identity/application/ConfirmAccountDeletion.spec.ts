import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { OtpRequest } from "../domain/OtpRequest";
import type { SignInMethods } from "../domain/SignInMethods";
import type { User } from "../domain/User";
import type { SignInCodeChannel } from "../domain/types";
import type { AccountDeletionListingsPort } from "../domain/ports/AccountDeletionListingsPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { SessionRepository } from "../domain/ports/SessionRepository";
import type { SignInMethodRepository } from "../domain/ports/SignInMethodRepository";
import type { UserRepository } from "../domain/ports/UserRepository";
import { ConfirmAccountDeletion } from "./ConfirmAccountDeletion";
import { DeleteMe } from "./DeleteMe";
import { VerifySignInCode } from "./VerifySignInCode";

const NOW = new Date("2026-09-25T00:00:00.000Z");
const GRACE_END = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
const CODE = "123456";
const REVIEWER_CODE = "654321";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    phone: "+99361234567",
    phoneVerifiedAt: NOW,
    email: null,
    emailVerifiedAt: null,
    displayName: null,
    avatarUrl: null,
    locale: "ru",
    role: "seller",
    createdAt: NOW,
    updatedAt: NOW,
    deletionScheduledAt: null,
    ...overrides,
  };
}

function hash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

class FakeOtpRepo implements OtpRequestRepository {
  records: OtpRequest[] = [];
  verified: Array<{ id: string; userId: string | undefined }> = [];

  add(input: {
    destination: string;
    userId: string | null;
    code?: string;
    expiresAt?: Date;
  }): OtpRequest {
    const record: OtpRequest = {
      id: `request-${this.records.length + 1}`,
      channel: input.destination.startsWith("+") ? "phone" : "email",
      destination: input.destination,
      codeHash: hash(input.code ?? CODE),
      expiresAt: input.expiresAt ?? new Date(NOW.getTime() + 5 * 60_000),
      verifiedAt: null,
      attempts: 0,
      userId: input.userId,
      ip: "10.0.0.1",
      createdAt: NOW,
    };
    this.records.push(record);
    return record;
  }

  async findLatestByDestination(
    channel: SignInCodeChannel,
    destination: string,
  ): Promise<OtpRequest | null> {
    return this.records.findLast(
      (record) => record.channel === channel && record.destination === destination,
    ) ?? null;
  }

  async findLatestByDestinationAndUser(
    channel: SignInCodeChannel,
    destination: string,
    userId: string,
  ): Promise<OtpRequest | null> {
    return this.records.findLast(
      (record) =>
        record.channel === channel &&
        record.destination === destination &&
        record.userId === userId,
    ) ?? null;
  }

  async markVerified(id: string, userId?: string): Promise<OtpRequest> {
    this.verified.push({ id, userId });
    return this.update(id, (record) => ({
      ...record,
      verifiedAt: NOW,
      userId: userId ?? record.userId,
    }));
  }

  async incrementAttempts(id: string): Promise<OtpRequest> {
    return this.update(id, (record) => ({ ...record, attempts: record.attempts + 1 }));
  }

  async create(): Promise<OtpRequest> { throw new Error("unused"); }
  async findById(): Promise<OtpRequest | null> { return null; }
  async countByDestinationSince(): Promise<number> { return 0; }
  async countByIpSince(): Promise<number> { return 0; }

  private update(id: string, change: (record: OtpRequest) => OtpRequest): OtpRequest {
    const index = this.records.findIndex((record) => record.id === id);
    const updated = change(this.records[index] as OtpRequest);
    this.records[index] = updated;
    return updated;
  }
}

class FakeUsers implements UserRepository, SignInMethodRepository {
  scheduled = new Map<string, Date>();

  constructor(private readonly users: User[] = []) {}

  async findByPhone(phone: string): Promise<User | null> {
    return this.users.find((user) => user.phone === phone) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async scheduleDeletion(userId: string, deletionScheduledAt: Date): Promise<void> {
    this.scheduled.set(userId, deletionScheduledAt);
  }

  async create(_methods: SignInMethods): Promise<User> { throw new Error("unused"); }
  async delete(): Promise<void> { throw new Error("unused"); }
  async clearDeletionSchedule(): Promise<void> { throw new Error("unused"); }
  async findUsersWithExpiredDeletionGrace(): Promise<User[]> { return []; }
  async purgePersonalData(): Promise<void> { throw new Error("unused"); }
  async replaceSignInMethod(): Promise<User> { throw new Error("unused"); }
}

class FakeSessions implements Pick<SessionRepository, "deleteAllByUserId"> {
  revokedFor: string[] = [];

  async deleteAllByUserId(userId: string): Promise<number> {
    this.revokedFor.push(userId);
    return 2;
  }
}

class FakeListings implements AccountDeletionListingsPort {
  archivedFor: string[] = [];

  async archiveActiveListingsBySeller(sellerId: string): Promise<void> {
    this.archivedFor.push(sellerId);
  }

  async republishArchivedByDeletionListingsBySeller(): Promise<void> {
    throw new Error("unused");
  }
}

function setup(users: User[] = []) {
  const otpRepo = new FakeOtpRepo();
  const userRepo = new FakeUsers(users);
  const sessions = new FakeSessions();
  const listings = new FakeListings();
  const clock: ClockPort = { now: () => NOW };
  const deleteMe = new DeleteMe(
    userRepo,
    sessions as unknown as SessionRepository,
    listings,
    clock,
  );
  const useCase = new ConfirmAccountDeletion(
    otpRepo,
    userRepo,
    new VerifySignInCode(otpRepo, clock),
    deleteMe,
  );
  return { useCase, otpRepo, userRepo, sessions, listings };
}

describe("ConfirmAccountDeletion", () => {
  it("starts the same grace period as DELETE /me for the phone holder", async () => {
    const { useCase, otpRepo, userRepo, sessions, listings } = setup([makeUser()]);
    otpRepo.add({ destination: "+99361234567", userId: "user-1" });

    await expect(
      useCase.execute({ phone: "+99361234567", code: CODE }),
    ).resolves.toBeUndefined();

    expect(userRepo.scheduled.get("user-1")).toEqual(GRACE_END);
    expect(sessions.revokedFor).toEqual(["user-1"]);
    expect(listings.archivedFor).toEqual(["user-1"]);
    expect(otpRepo.verified).toEqual([{ id: "request-1", userId: "user-1" }]);
  });

  it("starts the grace period for the holder of a normalized email", async () => {
    const { useCase, otpRepo, userRepo } = setup([
      makeUser({ phone: null, phoneVerifiedAt: null, email: "seller@example.com", emailVerifiedAt: NOW }),
    ]);
    otpRepo.add({ destination: "seller@example.com", userId: "user-1" });

    await useCase.execute({ email: " Seller@Example.COM ", code: CODE });

    expect(userRepo.scheduled.get("user-1")).toEqual(GRACE_END);
  });

  it("consumes the code for an unheld value and changes nothing else", async () => {
    const { useCase, otpRepo, userRepo, sessions, listings } = setup();
    otpRepo.add({ destination: "nobody@example.com", userId: null });

    await expect(
      useCase.execute({ email: "nobody@example.com", code: CODE }),
    ).resolves.toBeUndefined();

    expect(userRepo.scheduled.size).toBe(0);
    expect(sessions.revokedFor).toEqual([]);
    expect(listings.archivedFor).toEqual([]);
    expect(otpRepo.verified).toEqual([{ id: "request-1", userId: undefined }]);
    await expect(
      useCase.execute({ email: "nobody@example.com", code: CODE }),
    ).rejects.toThrow("OTP code has already been used");
  });

  it("rejects a wrong code for held and unheld values alike", async () => {
    const held = setup([makeUser()]);
    held.otpRepo.add({ destination: "+99361234567", userId: "user-1" });
    const unheld = setup();
    unheld.otpRepo.add({ destination: "+99361234567", userId: null });

    await expect(
      held.useCase.execute({ phone: "+99361234567", code: "000000" }),
    ).rejects.toThrow("Invalid OTP code");
    await expect(
      unheld.useCase.execute({ phone: "+99361234567", code: "000000" }),
    ).rejects.toThrow("Invalid OTP code");
    expect(held.userRepo.scheduled.size).toBe(0);
  });

  it("locks the code after the fifth wrong attempt", async () => {
    const { useCase, otpRepo, userRepo } = setup([makeUser()]);
    otpRepo.add({ destination: "+99361234567", userId: "user-1" });

    for (let attempt = 1; attempt < 5; attempt += 1) {
      await expect(
        useCase.execute({ phone: "+99361234567", code: "000000" }),
      ).rejects.toThrow("Invalid OTP code");
    }
    await expect(
      useCase.execute({ phone: "+99361234567", code: "000000" }),
    ).rejects.toThrow("Too many attempts");
    await expect(
      useCase.execute({ phone: "+99361234567", code: CODE }),
    ).rejects.toThrow("Too many attempts");
    expect(userRepo.scheduled.size).toBe(0);
  });

  it("rejects an expired code", async () => {
    const { useCase, otpRepo, userRepo } = setup([makeUser()]);
    otpRepo.add({
      destination: "+99361234567",
      userId: "user-1",
      expiresAt: new Date(NOW.getTime() - 1),
    });

    await expect(
      useCase.execute({ phone: "+99361234567", code: CODE }),
    ).rejects.toThrow("OTP code has expired");
    expect(userRepo.scheduled.size).toBe(0);
  });

  it("ignores an unbound sign-in request, so a reviewer fixed code cannot delete", async () => {
    const reviewer = makeUser({
      phone: null,
      phoneVerifiedAt: null,
      email: "reviewer@review.auto.tm",
      emailVerifiedAt: NOW,
    });
    const { useCase, otpRepo, userRepo } = setup([reviewer]);
    otpRepo.add({ destination: "reviewer@review.auto.tm", userId: "user-1" });
    otpRepo.add({
      destination: "reviewer@review.auto.tm",
      userId: null,
      code: REVIEWER_CODE,
    });

    await expect(
      useCase.execute({ email: "reviewer@review.auto.tm", code: REVIEWER_CODE }),
    ).rejects.toThrow("Invalid OTP code");
    expect(userRepo.scheduled.size).toBe(0);
  });

  it("refuses a code issued while another User held the value", async () => {
    const { useCase, otpRepo, userRepo } = setup([makeUser({ id: "user-2" })]);
    otpRepo.add({ destination: "+99361234567", userId: "user-1" });

    await expect(
      useCase.execute({ phone: "+99361234567", code: CODE }),
    ).rejects.toThrow("No Sign-in Code request found");
    expect(userRepo.scheduled.size).toBe(0);
  });

  it("keeps the original purge date when the holder is already in grace", async () => {
    const scheduledAt = new Date("2026-10-01T00:00:00.000Z");
    const { useCase, otpRepo, userRepo, sessions } = setup([
      makeUser({ deletionScheduledAt: scheduledAt }),
    ]);
    otpRepo.add({ destination: "+99361234567", userId: "user-1" });

    await useCase.execute({ phone: "+99361234567", code: CODE });

    expect(userRepo.scheduled.size).toBe(0);
    expect(sessions.revokedFor).toEqual([]);
    expect(otpRepo.verified).toEqual([{ id: "request-1", userId: "user-1" }]);
  });
});
