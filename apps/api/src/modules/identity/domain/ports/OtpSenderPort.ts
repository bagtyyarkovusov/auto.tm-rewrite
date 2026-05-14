export interface OtpSenderPort {
  send(phone: string, code: string): Promise<void>;
}
