import { Injectable } from "@nestjs/common";

import type { PresencePort } from "../domain/ports/PresencePort";

@Injectable()
export class SocketConnectionRegistry implements PresencePort {
  private readonly socketToUser = new Map<string, string>();
  private readonly userSocketCounts = new Map<string, number>();
  private readonly lastSeenAt = new Map<string, Date>();

  register(socketId: string, userId: string): void {
    if (this.socketToUser.has(socketId)) {
      return;
    }

    this.socketToUser.set(socketId, userId);
    const previousCount = this.userSocketCounts.get(userId) ?? 0;
    this.userSocketCounts.set(userId, previousCount + 1);

    if (previousCount === 0) {
      // User is coming online; the stored last-seen timestamp is no longer current.
      this.lastSeenAt.delete(userId);
    }
  }

  unregister(socketId: string): void {
    const userId = this.socketToUser.get(socketId);
    if (!userId) {
      return;
    }

    this.socketToUser.delete(socketId);
    const count = (this.userSocketCounts.get(userId) ?? 1) - 1;
    if (count <= 0) {
      this.userSocketCounts.delete(userId);
      this.lastSeenAt.set(userId, new Date());
    } else {
      this.userSocketCounts.set(userId, count);
    }
  }

  isUserOnline(userId: string): boolean {
    return (this.userSocketCounts.get(userId) ?? 0) > 0;
  }

  getSocketCountForUser(userId: string): number {
    return this.userSocketCounts.get(userId) ?? 0;
  }

  getOnlineUserCount(): number {
    return this.userSocketCounts.size;
  }

  getLastSeenAt(userId: string): Date | undefined {
    return this.lastSeenAt.get(userId);
  }
}
