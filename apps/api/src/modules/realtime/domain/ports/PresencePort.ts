export interface PresencePort {
  isUserOnline(userId: string): boolean;
  getSocketCountForUser(userId: string): number;
  getOnlineUserCount(): number;
  getLastSeenAt(userId: string): Date | undefined;
}

export const PRESENCE_PORT = Symbol("PresencePort");
