export const EMAIL_DRIVER = {
  /** Records sends in memory and delivers nothing. Default on localhost and in tests. */
  Mock: "mock",
  Resend: "resend",
} as const;
export type EmailDriver = (typeof EMAIL_DRIVER)[keyof typeof EMAIL_DRIVER];

export const EMAIL_SEND_FAILURE = {
  /** The provider refused the message; retrying cannot help. */
  Rejected: "REJECTED",
  /** Network fault or provider-side transient error; BullMQ may retry. */
  Retryable: "RETRYABLE",
} as const;
export type EmailSendFailure =
  (typeof EMAIL_SEND_FAILURE)[keyof typeof EMAIL_SEND_FAILURE];

/** Mirrors `Locale` in `@auto-tm/contracts`. */
export const EMAIL_LOCALE = {
  Ru: "ru",
  Tk: "tk",
  En: "en",
} as const;
export type EmailLocale = (typeof EMAIL_LOCALE)[keyof typeof EMAIL_LOCALE];

/** Mirrors `SignInCodePurpose` in `@auto-tm/contracts`. */
export const SIGN_IN_CODE_PURPOSE = {
  SignIn: "sign-in",
  SignInMethod: "sign-in-method",
  AccountDeletion: "account-deletion",
} as const;
export type SignInCodePurpose =
  (typeof SIGN_IN_CODE_PURPOSE)[keyof typeof SIGN_IN_CODE_PURPOSE];

/** Email Sign-in Codes expire after 10 minutes (ADR-0054). */
export const EMAIL_SIGN_IN_CODE_EXPIRY_MINUTES = 10;

/** ADR-0055: stop below Resend Free's 100-a-day cap. */
export const DEFAULT_EMAIL_DAILY_CAP = 80;
