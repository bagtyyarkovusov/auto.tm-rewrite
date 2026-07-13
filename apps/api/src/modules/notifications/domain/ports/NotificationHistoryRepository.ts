import type { DirectMessageNotification } from "../DirectMessageNotification";

export interface NotificationHistoryRepository {
  save(notification: DirectMessageNotification): Promise<void>;
}

export const NOTIFICATION_HISTORY_REPOSITORY = Symbol(
  "NotificationHistoryRepository",
);
