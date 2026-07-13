import { Injectable } from "@nestjs/common";

import type { PresencePort } from "../domain/ports/PresencePort";

@Injectable()
export class SocketConnectionRegistry implements PresencePort {
  private readonly socketToUser = new Map<string, string>();
  private readonly userSocketCounts = new Map<string, number>();

  register(socketId: string, userId: string): void {
    if (this.socketToUser.has(socketId)) {
      return;
    }

    this.socketToUser.set(socketId, userId);
    this.userSocketCounts.set(userId, (this.userSocketCounts.get(userId) ?? 0) + 1);
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
}
