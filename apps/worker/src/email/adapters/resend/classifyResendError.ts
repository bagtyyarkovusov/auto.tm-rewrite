import type { EmailSendResult } from "../../domain/EmailSenderPort";
import { EMAIL_SEND_FAILURE } from "../../domain/types";

export interface ResendErrorLike {
  name: string;
  statusCode: number | null;
}

// Transient on Resend's side or in transit. `concurrent_idempotent_requests`
// means an earlier attempt with the same key is still in flight.
const RETRYABLE_NAMES = new Set([
  "rate_limit_exceeded",
  "application_error",
  "internal_server_error",
  "concurrent_idempotent_requests",
]);

/**
 * Everything not known to be transient is a rejection, so a bad address, a
 * suppressed recipient, a spent quota or a misconfigured key fails the job
 * once instead of retrying. A null status code is a network fault.
 */
export function classifyResendError(error: ResendErrorLike): EmailSendResult & { ok: false } {
  if (error.statusCode === null) {
    return { ok: false, reason: EMAIL_SEND_FAILURE.Retryable, cause: "network_error" };
  }
  if (RETRYABLE_NAMES.has(error.name)) {
    return { ok: false, reason: EMAIL_SEND_FAILURE.Retryable, cause: error.name };
  }
  return { ok: false, reason: EMAIL_SEND_FAILURE.Rejected, cause: error.name };
}
