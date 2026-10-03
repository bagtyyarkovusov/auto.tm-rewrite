/**
 * Whether a phone is the User's own sign-in phone (ADR-0081). Identity answers
 * yes or no and never returns the value, so Listings never reads a Sign-in
 * Method.
 */
export interface AccountPhonePort {
  holdsSignInPhone(userId: string, phone: string): Promise<boolean>;
}

export const ACCOUNT_PHONE_PORT = Symbol("AccountPhonePort");
