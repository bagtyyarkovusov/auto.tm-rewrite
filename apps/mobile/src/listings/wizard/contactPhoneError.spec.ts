import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";

import { ApiError } from "../../api/client";
import { resources } from "../../i18n/resources";

import {
  getContactPhoneRequestErrorCopy,
  getContactPhoneVerifyErrorCopy,
  isContactPhoneNotConfirmedError,
  isContactPhonePublishError,
  isContactPhoneRequiredError,
} from "./contactPhoneError";

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key;

describe("getContactPhoneRequestErrorCopy", () => {
  it("maps a malformed number to the format error", () => {
    const copy = getContactPhoneRequestErrorCopy(
      new ApiError("VALIDATION_FAILED", 400),
      t,
    );
    expect(copy).toEqual({
      message: "contactPhoneFormatError",
      dailyLimit: false,
      retryInSeconds: null,
    });
  });

  it("maps the per-number daily budget to the ADR-0081 wording with no time", () => {
    const copy = getContactPhoneRequestErrorCopy(
      new ApiError("RATE_LIMITED", 400, undefined, {
        reason: "destination_limit",
        retryInSeconds: 0,
      }),
      t,
    );
    expect(copy).toEqual({
      message: "contactPhoneDailyLimit",
      dailyLimit: true,
      retryInSeconds: null,
    });
  });

  it("maps the per-IP budget to the general rate message with no Help link", () => {
    const copy = getContactPhoneRequestErrorCopy(
      new ApiError("RATE_LIMITED", 400, undefined, {
        reason: "ip_limit",
        retryInSeconds: 0,
      }),
      t,
    );
    expect(copy).toEqual({
      message: "contactPhoneRateLimited",
      dailyLimit: false,
      retryInSeconds: null,
    });
  });

  it("carries the wait of a backoff refusal", () => {
    const copy = getContactPhoneRequestErrorCopy(
      new ApiError("RATE_LIMITED", 400, undefined, {
        reason: "backoff",
        retryInSeconds: 120,
      }),
      t,
    );
    expect(copy).toEqual({
      message: "contactPhoneRateLimited",
      dailyLimit: false,
      retryInSeconds: 120,
    });
  });

  it("maps offline to the offline message", () => {
    expect(
      getContactPhoneRequestErrorCopy(new ApiError("NETWORK_ERROR", 0), t)
        .message,
    ).toBe("offline");
    expect(
      getContactPhoneRequestErrorCopy(new Error("boom"), t).message,
    ).toBe("offline");
  });

  it("falls back to the generic request failure", () => {
    expect(
      getContactPhoneRequestErrorCopy(new ApiError("INTERNAL", 500), t).message,
    ).toBe("requestFailed");
  });
});

describe("getContactPhoneVerifyErrorCopy", () => {
  it("shows the attempts left from INVALID_OTP details", () => {
    const copy = getContactPhoneVerifyErrorCopy(
      new ApiError("INVALID_OTP", 400, undefined, { attemptsLeft: 3 }),
      t,
    );
    expect(copy).toEqual({
      message: 'contactPhoneWrongCodeAttemptsLeft:{"count":3}',
      needsNewCode: false,
    });
  });

  it("falls back to a plain wrong-code message without details", () => {
    const copy = getContactPhoneVerifyErrorCopy(
      new ApiError("INVALID_OTP", 400),
      t,
    );
    expect(copy).toEqual({
      message: "contactPhoneWrongCode",
      needsNewCode: false,
    });
  });

  it("locks entry after five wrong codes and offers a new code", () => {
    expect(
      getContactPhoneVerifyErrorCopy(new ApiError("OTP_LOCKED", 400), t),
    ).toEqual({ message: "contactPhoneLockedCode", needsNewCode: true });
  });

  it("treats expired, unknown and used codes as needing a new code", () => {
    for (const code of ["OTP_EXPIRED", "OTP_NOT_FOUND", "OTP_ALREADY_USED"]) {
      expect(getContactPhoneVerifyErrorCopy(new ApiError(code, 400), t)).toEqual(
        { message: "contactPhoneExpiredCode", needsNewCode: true },
      );
    }
  });

  it("keeps the screen on offline and rate errors", () => {
    expect(
      getContactPhoneVerifyErrorCopy(new ApiError("NETWORK_ERROR", 0), t),
    ).toEqual({ message: "offline", needsNewCode: false });
    expect(
      getContactPhoneVerifyErrorCopy(new ApiError("RATE_LIMITED", 429), t),
    ).toEqual({ message: "contactPhoneRateLimited", needsNewCode: false });
  });
});

describe("publish and relist rejections", () => {
  it("recognizes the two contact-phone codes", () => {
    const required = new ApiError("CONTACT_PHONE_REQUIRED", 400);
    const notConfirmed = new ApiError("CONTACT_PHONE_NOT_CONFIRMED", 400, undefined, {
      reason: "expired",
    });
    expect(isContactPhoneRequiredError(required)).toBe(true);
    expect(isContactPhoneNotConfirmedError(notConfirmed)).toBe(true);
    expect(isContactPhonePublishError(required)).toBe(true);
    expect(isContactPhonePublishError(notConfirmed)).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isContactPhonePublishError(new ApiError("RATE_LIMITED", 429))).toBe(false);
    expect(isContactPhonePublishError(new Error("boom"))).toBe(false);
    expect(isContactPhoneRequiredError(new ApiError("CONTACT_PHONE_NOT_CONFIRMED", 400))).toBe(false);
  });
});

describe("the daily limit wording (ADR-0081)", () => {
  function translator(locale: string) {
    const i18n = createInstance();
    void i18n.init({ lng: locale, resources, defaultNS: "common", initImmediate: false });
    return i18n.t.bind(i18n) as (key: string, options?: Record<string, unknown>) => string;
  }

  it.each([
    ["en", "No more codes to this number today. Try again tomorrow or use another number."],
    ["ru", "Сегодня коды на этот номер больше не отправляются. Попробуйте завтра или укажите другой номер."],
    ["tk", "Şu gün bu belgä başga kod iberilmeýär. Ertir synanyşyň ýa-da başga belgi giriziň."],
  ])("%s names no time", (locale, message) => {
    const copy = getContactPhoneRequestErrorCopy(
      new ApiError("RATE_LIMITED", 400, undefined, {
        reason: "destination_limit",
        retryInSeconds: 0,
      }),
      translator(locale),
    );
    expect(copy.message).toBe(message);
    expect(copy.dailyLimit).toBe(true);
  });
});
