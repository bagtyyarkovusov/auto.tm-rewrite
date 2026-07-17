import type { NotificationHistoryStatus } from "./types";

export type { NotificationHistoryStatus };

export interface NotificationHistoryStore {
  updateStatus(
    historyId: string,
    status: NotificationHistoryStatus,
    details?: Record<string, unknown>,
  ): Promise<void>;
}

export const NOTIFICATION_HISTORY_STORE = Symbol("NotificationHistoryStore");
