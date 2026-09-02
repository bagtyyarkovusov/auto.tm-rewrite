import type { NotificationHistoryStatus } from "./types";

export type { NotificationHistoryStatus };

export interface NotificationHistoryStore {
  updateStatus(
    historyId: string,
    status: NotificationHistoryStatus,
    details?: Record<string, unknown>,
  ): Promise<void>;

  /**
   * Tokens already delivered for this history row on an earlier attempt.
   * BullMQ retries the whole job, so the use-case reads this to avoid pushing
   * a duplicate notification to a device that already received it.
   */
  listSucceededTokens(historyId: string): Promise<string[]>;
}

export const NOTIFICATION_HISTORY_STORE = Symbol("NotificationHistoryStore");
