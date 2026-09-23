export const SIGN_IN_CODE_CHANNELS = {
  PHONE: "phone",
  EMAIL: "email",
} as const;

export type SignInCodeChannel =
  (typeof SIGN_IN_CODE_CHANNELS)[keyof typeof SIGN_IN_CODE_CHANNELS];
