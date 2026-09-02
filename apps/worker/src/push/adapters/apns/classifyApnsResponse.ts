import type { PushResult } from "../../domain/PushPort";
import { PUSH_RESULT_REASON } from "../../domain/types";

/**
 * APNS failure classification.
 *
 * node-apn resolves rather than throws: rejections land in `failed` with an
 * HTTP `status` plus a `response.reason`, while connection faults land in
 * `failed` with an `error` and no status (verified through Context7,
 * `/parse-community/node-apn`).
 */
export interface ApnsFailure {
  device: string;
  status?: number;
  response?: { reason?: string };
  error?: Error;
}

export interface ApnsResponse {
  sent: Array<{ device: string }>;
  failed: ApnsFailure[];
}

/** Reasons that mean this specific device token is dead. */
const INVALID_TOKEN_REASONS = new Set(["Unregistered", "BadDeviceToken"]);

/** Reasons that resolve on their own; node-apn refreshes provider tokens. */
const RETRYABLE_REASONS = new Set([
  "TooManyRequests",
  "TooManyProviderTokenUpdates",
  "ExpiredProviderToken",
  "IdleTimeout",
  "ServiceUnavailable",
  "InternalServerError",
  "Shutdown",
]);

export function classifyApnsResponse(response: ApnsResponse): PushResult {
  if (response.sent.length > 0) {
    return { ok: true };
  }

  const failure = response.failed[0];
  if (failure === undefined) {
    return {
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: "apns/empty-response",
    };
  }

  // Connection-level fault: APNS never rendered a verdict on the token.
  if (failure.status === undefined) {
    return {
      ok: false,
      reason: PUSH_RESULT_REASON.Retryable,
      cause: "apns/connection-error",
    };
  }

  const reason = failure.response?.reason ?? `status-${failure.status}`;

  if (failure.status === 410 || INVALID_TOKEN_REASONS.has(reason)) {
    return { ok: false, reason: PUSH_RESULT_REASON.InvalidToken };
  }

  if (
    failure.status === 429 ||
    failure.status >= 500 ||
    RETRYABLE_REASONS.has(reason)
  ) {
    return { ok: false, reason: PUSH_RESULT_REASON.Retryable, cause: reason };
  }

  // Everything else is a configuration or payload defect: DeviceTokenNotForTopic,
  // TopicDisallowed, BadPayload, and friends. Retrying or deactivating tokens
  // would both hide the real cause.
  return { ok: false, reason: PUSH_RESULT_REASON.Permanent, cause: reason };
}
