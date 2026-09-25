export const SIGN_IN_CODE_CHANNELS = {
  PHONE: "phone",
  EMAIL: "email",
} as const;

export type SignInCodeChannel =
  (typeof SIGN_IN_CODE_CHANNELS)[keyof typeof SIGN_IN_CODE_CHANNELS];

export const IDENTITY_ERROR_CODES = {
  SIGN_IN_METHOD_TAKEN: "SIGN_IN_METHOD_TAKEN",
} as const;

export class IdentityDomainError extends Error {
  constructor(
    readonly code: (typeof IDENTITY_ERROR_CODES)[keyof typeof IDENTITY_ERROR_CODES],
    message: string,
  ) {
    super(message);
    this.name = "IdentityDomainError";
  }
}
