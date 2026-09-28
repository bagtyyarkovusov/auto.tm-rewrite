import type {
  EmailSendOptions,
  EmailSendResult,
  EmailSenderPort,
  OutgoingEmail,
} from "../domain/EmailSenderPort";

export interface RecordedEmailSend {
  email: OutgoingEmail;
  options: EmailSendOptions;
  result: EmailSendResult;
}

/**
 * `EMAIL_DRIVER=mock`. Records every send in memory and makes no network call.
 * Like the provider, it answers a repeated idempotency key with the first
 * result instead of recording a second send.
 */
export class MockEmailSender implements EmailSenderPort {
  sends: RecordedEmailSend[] = [];
  private nextResult: EmailSendResult = { ok: true };
  private byKey = new Map<string, EmailSendResult>();

  async send(email: OutgoingEmail, options: EmailSendOptions): Promise<EmailSendResult> {
    const earlier = this.byKey.get(options.idempotencyKey);
    if (earlier !== undefined) return earlier;

    const result = this.nextResult;
    if (result.ok) this.byKey.set(options.idempotencyKey, result);
    this.sends.push({ email, options, result });
    return result;
  }

  setResult(result: EmailSendResult): void {
    this.nextResult = result;
  }
}
