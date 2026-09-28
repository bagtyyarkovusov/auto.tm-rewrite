import { describe, it, expect } from "vitest";
import { Email } from "./Email";
import { Phone } from "./Phone";
import {
  assertLiveUserSignInMethods,
  assertSignInMethodsVerified,
  isPhoneVerified,
  NO_SIGN_IN_METHODS,
  verifiedSignInMethods,
} from "./SignInMethods";

const VERIFIED_AT = new Date("2026-09-22T10:00:00Z");

describe("SignInMethods", () => {
  describe("verifiedSignInMethods", () => {
    it("builds a phone-only User's methods verified at the confirmation time", () => {
      expect(
        verifiedSignInMethods({ phone: Phone.create("+99361234567"), verifiedAt: VERIFIED_AT }),
      ).toEqual({
        phone: "+99361234567",
        phoneVerifiedAt: VERIFIED_AT,
        email: null,
        emailVerifiedAt: null,
      });
    });

    it("builds an email-only User's methods with the normalised email", () => {
      expect(
        verifiedSignInMethods({ email: Email.create(" Me@Example.com "), verifiedAt: VERIFIED_AT }),
      ).toEqual({
        phone: null,
        phoneVerifiedAt: null,
        email: "me@example.com",
        emailVerifiedAt: VERIFIED_AT,
      });
    });

    it("refuses a live User with no Sign-in Method", () => {
      expect(() => verifiedSignInMethods({ verifiedAt: VERIFIED_AT })).toThrow(
        "A live User must have at least one Sign-in Method",
      );
    });
  });

  describe("assertSignInMethodsVerified", () => {
    it("accepts a purged User with no Sign-in Methods", () => {
      expect(() => assertSignInMethodsVerified(NO_SIGN_IN_METHODS)).not.toThrow();
    });

    it("rejects a stored phone without a verified-at time", () => {
      expect(() =>
        assertSignInMethodsVerified({ ...NO_SIGN_IN_METHODS, phone: "+99361234567" }),
      ).toThrow("A stored phone must have a verified-at time");
    });

    it("rejects a phone verified-at time without a phone", () => {
      expect(() =>
        assertSignInMethodsVerified({ ...NO_SIGN_IN_METHODS, phoneVerifiedAt: VERIFIED_AT }),
      ).toThrow("A stored phone must have a verified-at time");
    });

    it("rejects a stored email without a verified-at time", () => {
      expect(() =>
        assertSignInMethodsVerified({ ...NO_SIGN_IN_METHODS, email: "me@example.com" }),
      ).toThrow("A stored email must have a verified-at time");
    });
  });

  describe("assertLiveUserSignInMethods", () => {
    it("rejects a live User with no Sign-in Method", () => {
      expect(() => assertLiveUserSignInMethods(NO_SIGN_IN_METHODS)).toThrow(
        "A live User must have at least one Sign-in Method",
      );
    });

    it("rejects an email that is not trimmed and lowercased", () => {
      expect(() =>
        assertLiveUserSignInMethods({
          ...NO_SIGN_IN_METHODS,
          email: "Me@Example.com",
          emailVerifiedAt: VERIFIED_AT,
        }),
      ).toThrow("A stored email must be trimmed and lowercased");
    });

    it("accepts a User holding both methods", () => {
      expect(() =>
        assertLiveUserSignInMethods({
          phone: "+99361234567",
          phoneVerifiedAt: VERIFIED_AT,
          email: "me@example.com",
          emailVerifiedAt: VERIFIED_AT,
        }),
      ).not.toThrow();
    });
  });

  describe("isPhoneVerified", () => {
    it("is true only when a verified phone is stored", () => {
      expect(
        isPhoneVerified({ ...NO_SIGN_IN_METHODS, phone: "+99361234567", phoneVerifiedAt: VERIFIED_AT }),
      ).toBe(true);
      expect(
        isPhoneVerified({ ...NO_SIGN_IN_METHODS, email: "me@example.com", emailVerifiedAt: VERIFIED_AT }),
      ).toBe(false);
    });
  });
});
