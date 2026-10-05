type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface ContactPhoneRequestErrorCopy {
  message: string;
  dailyLimit: boolean;
  retryInSeconds: number | null;
}

export interface ContactPhoneVerifyErrorCopy {
  message: string;
  needsNewCode: boolean;
}

export function getContactPhoneRequestErrorCopy(
  _error: unknown,
  _t: Translate,
): ContactPhoneRequestErrorCopy {
  return { message: "unimplemented", dailyLimit: false, retryInSeconds: null };
}

export function getContactPhoneVerifyErrorCopy(
  _error: unknown,
  _t: Translate,
): ContactPhoneVerifyErrorCopy {
  return { message: "unimplemented", needsNewCode: false };
}

export function isContactPhoneRequiredError(_error: unknown): boolean {
  return false;
}

export function isContactPhoneNotConfirmedError(_error: unknown): boolean {
  return false;
}

export function isContactPhonePublishError(_error: unknown): boolean {
  return false;
}
