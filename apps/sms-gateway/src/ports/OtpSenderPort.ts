export type OtpSendRequest = { phone: string; body: string; requestId: string };

export type OtpSendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: string };

export interface OtpSenderPort {
  send(req: OtpSendRequest): Promise<OtpSendResult>;
}
