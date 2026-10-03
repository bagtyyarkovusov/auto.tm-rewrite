import type { SignInCodePurpose } from "./OtpRequest";

/** The SMS text for a code (ADR-0081). */
export function renderCodeSms(_input: {
  purpose: SignInCodePurpose;
  locale: "ru" | "tk" | "en";
  code: string;
}): string {
  throw new Error("not implemented");
}
