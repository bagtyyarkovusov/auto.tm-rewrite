import type { DirectMessageNotification } from "../DirectMessageNotification";

export interface NotificationHistoryRepository {
  save(notification: DirectMessageNotification): Promise<{ id: string }>;
}

export const NOTIFICATION_HISTORY_REPOSITORY = Symbol(
  "NotificationHistoryRepository",
);
