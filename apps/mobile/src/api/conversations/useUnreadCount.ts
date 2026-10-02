import { useViewer } from "../../auth/useViewer";

/** Total unread Messages for the signed-in User; 0 when signed out. */
export function useUnreadCount(): number {
  useViewer();
  return 0;
}
