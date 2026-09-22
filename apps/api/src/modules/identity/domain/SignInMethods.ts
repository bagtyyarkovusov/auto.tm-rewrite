import type { Email } from "./Email";
import type { Phone } from "./Phone";

/**
 * A User's Sign-in Methods (ADR-0054). Each value is stored only together with
 * its verified-at time, so a stored value is a verified value. A live User has
 * at least one; a User purged after deletion has none.
 */
export interface SignInMethods {
  readonly phone: string | null;
  readonly phoneVerifiedAt: Date | null;
  readonly email: string | null;
  readonly emailVerifiedAt: Date | null;
}

export const NO_SIGN_IN_METHODS: SignInMethods = {
  phone: null,
  phoneVerifiedAt: null,
  email: null,
  emailVerifiedAt: null,
};

/** Throws when a value and its verified-at time are not both set or both null. */
export function assertSignInMethodsVerified(methods: SignInMethods): void {
  if ((methods.phone === null) !== (methods.phoneVerifiedAt === null)) {
    throw new Error("A stored phone must have a verified-at time");
  }
  if ((methods.email === null) !== (methods.emailVerifiedAt === null)) {
    throw new Error("A stored email must have a verified-at time");
  }
}

export function hasSignInMethod(methods: SignInMethods): boolean {
  return methods.phone !== null || methods.email !== null;
}

export function isPhoneVerified(methods: SignInMethods): boolean {
  return methods.phone !== null && methods.phoneVerifiedAt !== null;
}

/** Throws unless every stored value is verified and at least one is stored. */
export function assertLiveUserSignInMethods(methods: SignInMethods): void {
  assertSignInMethodsVerified(methods);
  if (!hasSignInMethod(methods)) {
    throw new Error("A live User must have at least one Sign-in Method");
  }
}

/** Sign-in Methods for a new User, all verified at the moment its code was confirmed. */
export function verifiedSignInMethods(input: {
  phone?: Phone;
  email?: Email;
  verifiedAt: Date;
}): SignInMethods {
  const methods: SignInMethods = {
    phone: input.phone?.value ?? null,
    phoneVerifiedAt: input.phone ? input.verifiedAt : null,
    email: input.email?.value ?? null,
    emailVerifiedAt: input.email ? input.verifiedAt : null,
  };
  assertLiveUserSignInMethods(methods);
  return methods;
}
