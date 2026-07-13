export interface PresencePort {
  isUserOnline(userId: string): boolean;
  getSocketCountForUser(userId: string): number;
  getOnlineUserCount(): number;
}

export const PRESENCE_PORT = Symbol("PresencePort");
