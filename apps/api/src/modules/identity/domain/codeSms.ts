import type { SignInCodePurpose } from "./OtpRequest";

type Locale = "ru" | "tk" | "en";

/**
 * Contact-phone texts approved in ADR-0081, each one SMS segment: RU 70 and
 * TK 66 characters in UCS-2, EN 81 in GSM-7. Any wording change is recounted
 * against those limits; none may carry a link.
 */
const CONTACT_PHONE_TEXT: Record<Locale, (code: string) => string> = {
  ru: (code) => `AutoTM ${code}: номер покажут в объявлении. Не давайте код без согласия`,
  tk: (code) => `AutoTM ${code}: belgiňiz bildirişde görüner. Razy bolmasaňyz bermäň`,
  en: (code) =>
    `AutoTM code ${code} puts this number on a car listing. Share it only if you agree.`,
};

/**
 * The SMS text for a code. Only the contact-phone text is decided; the other
 * purposes have no approved wording yet, so their body is the bare code.
 */
export function renderCodeSms(input: {
  purpose: SignInCodePurpose;
  locale: Locale;
  code: string;
}): string {
  if (input.purpose === "listing-contact-phone") {
    return CONTACT_PHONE_TEXT[input.locale](input.code);
  }
  return input.code;
}
