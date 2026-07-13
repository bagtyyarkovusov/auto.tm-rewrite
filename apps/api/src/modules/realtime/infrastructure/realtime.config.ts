export const REALTIME_NAMESPACE = process.env["SOCKET_IO_NAMESPACE"] || "/ws/chat";
export const USER_ROOM_PREFIX = "user:";

export function userRoom(userId: string): string {
  return `${USER_ROOM_PREFIX}${userId}`;
}
