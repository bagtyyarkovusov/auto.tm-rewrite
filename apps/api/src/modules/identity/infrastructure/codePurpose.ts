import type { PrismaService } from "@auto-tm/db";

import type { SignInCodePurpose } from "../domain/OtpRequest";

/** `CodePurpose`, the database enum that stores a `SignInCodePurpose`. */
export type CodePurpose = Awaited<
  ReturnType<PrismaService["otpRequest"]["create"]>
>["purpose"];

const STORED = {
  "sign-in": "sign_in",
  "sign-in-method": "sign_in_method",
  "account-deletion": "account_deletion",
  "listing-contact-phone": "listing_contact_phone",
} as const satisfies Record<SignInCodePurpose, CodePurpose>;

const READ = {
  sign_in: "sign-in",
  sign_in_method: "sign-in-method",
  account_deletion: "account-deletion",
  listing_contact_phone: "listing-contact-phone",
} as const satisfies Record<CodePurpose, SignInCodePurpose>;

/** The one mapping from the contract purpose to its stored form (ADR-0081). */
export function toCodePurpose(purpose: SignInCodePurpose): CodePurpose {
  return STORED[purpose];
}

export function fromCodePurpose(stored: CodePurpose): SignInCodePurpose {
  return READ[stored];
}
