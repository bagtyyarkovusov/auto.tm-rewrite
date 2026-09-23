import { Email } from "./Email";
import { Phone } from "./Phone";
import {
  verifiedSignInMethods,
  type SignInMethods,
} from "./SignInMethods";
import { SIGN_IN_CODE_CHANNELS, type SignInCodeChannel } from "./types";

const PHONE_CODE_TTL_MS = 5 * 60 * 1000;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;

export type SignInCodeDestinationInput = { phone: string } | { email: string };

export interface SignInCodeDestination {
  channel: SignInCodeChannel;
  value: string;
  expiresAt(now: Date): Date;
  verifiedMethods(now: Date): SignInMethods;
}

export function signInCodeDestination(
  input: SignInCodeDestinationInput,
): SignInCodeDestination {
  if ("phone" in input) {
    const phone = Phone.create(input.phone);
    return {
      channel: SIGN_IN_CODE_CHANNELS.PHONE,
      value: phone.value,
      expiresAt: (now) => new Date(now.getTime() + PHONE_CODE_TTL_MS),
      verifiedMethods: (now) => verifiedSignInMethods({ phone, verifiedAt: now }),
    };
  }

  const email = Email.create(input.email);
  return {
    channel: SIGN_IN_CODE_CHANNELS.EMAIL,
    value: email.value,
    expiresAt: (now) => new Date(now.getTime() + EMAIL_CODE_TTL_MS),
    verifiedMethods: (now) => verifiedSignInMethods({ email, verifiedAt: now }),
  };
}
