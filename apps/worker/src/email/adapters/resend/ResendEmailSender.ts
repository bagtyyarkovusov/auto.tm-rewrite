import type {
  EmailSendOptions,
  EmailSendResult,
  EmailSenderPort,
  OutgoingEmail,
} from "../../domain/EmailSenderPort";
import { EMAIL_SEND_FAILURE } from "../../domain/types";

import { classifyResendError, type ResendErrorLike } from "./classifyResendError";

export interface ResendSendRequest {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** The single SDK call this adapter makes, injectable so tests need no network. */
export type ResendSendFn = (
  request: ResendSendRequest,
  options: { idempotencyKey: string },
) => Promise<{ error: ResendErrorLike | null }>;

/** Builds the send function from the official SDK. Loaded lazily, like the push SDKs. */
export async function createResendSendFn(apiKey: string): Promise<ResendSendFn> {
  const { Resend } = await import("resend");
  const client = new Resend(apiKey);
  return (request, options) => client.emails.send(request, options);
}

/** `EMAIL_DRIVER=resend` (ADR-0055). No reply-to; tracking stays off at the domain. */
export class ResendEmailSender implements EmailSenderPort {
  constructor(
    private readonly sendFn: ResendSendFn,
    private readonly from: string,
  ) {}

  async send(email: OutgoingEmail, options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      const { error } = await this.sendFn(
        {
          from: this.from,
          to: email.to,
          subject: email.subject,
          text: email.text,
          html: email.html,
        },
        { idempotencyKey: options.idempotencyKey },
      );
      return error === null ? { ok: true } : classifyResendError(error);
    } catch {
      // The SDK reports API errors in `error`; a throw is a transport fault.
      // Its message is not kept, so nothing from the request can reach logs.
      return { ok: false, reason: EMAIL_SEND_FAILURE.Retryable, cause: "sdk_threw" };
    }
  }
}
