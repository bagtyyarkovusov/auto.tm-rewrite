export const REALTIME_NAMESPACE = "/ws/chat";
export const USER_ROOM_PREFIX = "user:";

export function userRoom(userId: string): string {
  return `${USER_ROOM_PREFIX}${userId}`;
}
