import type { EMAIL_SEND_FAILURE } from "./types";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSendOptions {
  /** A retried job reuses it, so the provider never sends a second email. */
  idempotencyKey: string;
}

/**
 * `cause` is a provider error code, never a provider error object or message:
 * results reach logs and BullMQ's failed-job reason.
 */
export type EmailSendResult =
  | { ok: true }
  | { ok: false; reason: typeof EMAIL_SEND_FAILURE.Rejected; cause: string }
  | { ok: false; reason: typeof EMAIL_SEND_FAILURE.Retryable; cause: string };

export interface EmailSenderPort {
  send(email: OutgoingEmail, options: EmailSendOptions): Promise<EmailSendResult>;
}

export const EMAIL_SENDER_PORT = Symbol("EmailSenderPort");
