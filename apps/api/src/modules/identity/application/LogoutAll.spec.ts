import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { Session } from "../domain/Session";
import type { SessionRepository } from "../domain/ports/SessionRepository";
import { LogoutAll } from "./LogoutAll";

const NOW = new Date("2026-05-14T12:00:00Z");

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: randomUUID(),
    userId: "user-1",
    refreshTokenHash: "hashed:something",
    deviceLabel: null,
    userAgent: null,
    expiresAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: NOW,
    lastSeenAt: NOW,
    adminTotpExpiresAt: null,
    ...overrides,
  };
}

class FakeSessionRepository implements SessionRepository {
  sessions: Session[] = [];
  deletedAllUserId: string | null = null;

  async create(input: Parameters<SessionRepository["create"]>[0]): Promise<Session> {
    const s: Session = { ...input, id: randomUUID(), createdAt: NOW, lastSeenAt: NOW, adminTotpExpiresAt: null };
    this.sessions.push(s);
    return s;
  }

  async countByUserId(_userId: string): Promise<number> { return 0; }
  async deleteExpiredByUserId(_userId: string): Promise<number> { return 0; }
  async deleteOldestByUserId(_userId: string): Promise<void> {}
  async findByRefreshToken(): Promise<null> { return null; }
  async rotateRefreshToken(): Promise<boolean> { return true; }
  async findById(id: string): Promise<Session | null> {
    return this.sessions.find((s) => s.id === id) ?? null;
  }
  async updateAdminTotpExpiresAt(): Promise<void> {}
  async delete(_id: string): Promise<void> {}

  async deleteAllByUserId(userId: string): Promise<number> {
    this.deletedAllUserId = userId;
    const before = this.sessions.length;
    this.sessions = this.sessions.filter((s) => s.userId !== userId);
    return before - this.sessions.length;
  }
}

function makeUseCase(sessionRepo?: FakeSessionRepository) {
  return new LogoutAll(sessionRepo ?? new FakeSessionRepository());
}

describe("LogoutAll", () => {
  let sessionRepo: FakeSessionRepository;

  beforeEach(() => {
    sessionRepo = new FakeSessionRepository();
  });

  it("deletes all sessions for the given user", async () => {
    sessionRepo.sessions.push(
      makeSession({ id: "s1", userId: "user-1" }),
      makeSession({ id: "s2", userId: "user-1" }),
      makeSession({ id: "s3", userId: "user-1" }),
    );

    const uc = makeUseCase(sessionRepo);
    await uc.execute({ userId: "user-1" });

    expect(sessionRepo.deletedAllUserId).toBe("user-1");
    expect(sessionRepo.sessions).toHaveLength(0);
  });

  it("leaves other users' sessions untouched", async () => {
    sessionRepo.sessions.push(
      makeSession({ id: "s1", userId: "user-1" }),
      makeSession({ id: "s2", userId: "user-1" }),
      makeSession({ id: "s3", userId: "user-2" }),
      makeSession({ id: "s4", userId: "user-3" }),
    );

    const uc = makeUseCase(sessionRepo);
    await uc.execute({ userId: "user-1" });

    expect(sessionRepo.sessions).toHaveLength(2);
    expect(sessionRepo.sessions.every((s) => s.userId !== "user-1")).toBe(true);
  });

  it("succeeds (no-op) when the user has no sessions", async () => {
    const uc = makeUseCase(sessionRepo);
    await uc.execute({ userId: "user-1" });

    expect(sessionRepo.deletedAllUserId).toBe("user-1");
    expect(sessionRepo.sessions).toHaveLength(0);
  });
});
