import type { PushResult } from "../../domain/PushPort";
import { PUSH_RESULT_REASON } from "../../domain/types";

/**
 * FCM failure classification.
 *
 * Codes come from `MessagingErrorCode` in firebase-admin (verified through
 * Context7, `/firebase/firebase-admin-node`). Only codes that unambiguously
 * describe a dead registration token deactivate that token; ambiguous codes
 * such as `invalid-argument` (raised both for malformed tokens and malformed
 * payloads) stay permanent so a payload bug can never mass-deactivate devices.
 */
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/installation-id-not-registered",
  "messaging/invalid-recipient",
]);

const RETRYABLE_CODES = new Set([
  "messaging/server-unavailable",
  "messaging/internal-error",
  "messaging/unknown-error",
  "messaging/message-rate-exceeded",
  "messaging/device-message-rate-exceeded",
  "messaging/topics-message-rate-exceeded",
  "messaging/quota-exceeded",
  "app/network-error",
  "app/network-timeout",
]);

export function classifyFcmError(error: unknown): PushResult {
  const code = errorCodeOf(error);

  if (code === null) {
    // No provider code at all: a transport/network fault rather than an FCM
    // verdict. Retrying is safe; deactivating the token would not be.
    return { ok: false, reason: PUSH_RESULT_REASON.Retryable, cause: "fcm/no-error-code" };
  }

  if (INVALID_TOKEN_CODES.has(code)) {
    return { ok: false, reason: PUSH_RESULT_REASON.InvalidToken };
  }

  if (RETRYABLE_CODES.has(code)) {
    return { ok: false, reason: PUSH_RESULT_REASON.Retryable, cause: code };
  }

  return { ok: false, reason: PUSH_RESULT_REASON.Permanent, cause: code };
}

/** Reads only the provider error code; error objects may carry credentials. */
function errorCodeOf(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code !== "" ? code : null;
}
