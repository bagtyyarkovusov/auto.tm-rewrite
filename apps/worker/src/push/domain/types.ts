export const NOTIFICATION_HISTORY_STATUS = {
  Pending: "pending",
  Delivered: "delivered",
  Failed: "failed",
} as const;
export type NotificationHistoryStatus =
  (typeof NOTIFICATION_HISTORY_STATUS)[keyof typeof NOTIFICATION_HISTORY_STATUS];

export const PUSH_RESULT_REASON = {
  InvalidToken: "INVALID_TOKEN",
  Retryable: "RETRYABLE",
  Permanent: "PERMANENT",
} as const;
export type PushResultReason =
  (typeof PUSH_RESULT_REASON)[keyof typeof PUSH_RESULT_REASON];

export const PUSH_TRANSPORT = {
  Test: "test",
  FcmApns: "fcm-apns",
  Ntfy: "ntfy",
} as const;
export type PushTransport = (typeof PUSH_TRANSPORT)[keyof typeof PUSH_TRANSPORT];

export const NO_ACTIVE_PUSH_TOKENS_REASON = "NO_TOKENS" as const;
