import type { Session } from "../Session";

export interface SessionRepository {
  create(input: {
    userId: string;
    refreshTokenHash: string;
    deviceLabel: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<Session>;

  countByUserId(userId: string): Promise<number>;

  deleteExpiredByUserId(userId: string): Promise<number>;

  /** Deletes the session with the earliest createdAt for the given user. */
  deleteOldestByUserId(userId: string): Promise<void>;
}
