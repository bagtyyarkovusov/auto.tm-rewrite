import type { SignInCodePurpose } from "../OtpRequest";

/** One SMS code to send. The adapter renders the text for the purpose and locale (ADR-0081). */
export interface OtpSms {
  phone: string;
  code: string;
  purpose: SignInCodePurpose;
  locale: "ru" | "tk" | "en";
  requestId: string;
}

export interface OtpSenderPort {
  send(sms: OtpSms): Promise<void>;
}
