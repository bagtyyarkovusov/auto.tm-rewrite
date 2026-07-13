export type NotificationHistoryStatus = "pending" | "delivered" | "failed";

export interface NotificationHistoryStore {
  updateStatus(
    historyId: string,
    status: NotificationHistoryStatus,
    details?: Record<string, unknown>,
  ): Promise<void>;
}

export const NOTIFICATION_HISTORY_STORE = Symbol("NotificationHistoryStore");
