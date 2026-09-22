import { describe, expect, it } from "vitest";

import { renderSignInCodeEmail } from "./renderSignInCodeEmail";
import { EMAIL_LOCALE, SIGN_IN_CODE_PURPOSE, type EmailLocale } from "./types";

const NEVER_ASK: Record<EmailLocale, string> = {
  en: "AutoTM will never ask you for this code",
  ru: "AutoTM никогда не попросит у вас этот код",
  tk: "AutoTM bu kody sizden hiç haçan soramaz",
};

describe("renderSignInCodeEmail", () => {
  for (const locale of Object.values(EMAIL_LOCALE)) {
    for (const purpose of Object.values(SIGN_IN_CODE_PURPOSE)) {
      it(`renders ${locale} / ${purpose} per ADR-0055`, () => {
        const email = renderSignInCodeEmail({
          to: "buyer@example.com",
          code: "123456",
          locale,
          purpose,
        });

        expect(email.to).toBe("buyer@example.com");
        expect(email.subject).toContain("123456");
        expect(email.subject).toContain("AutoTM");
        for (const part of [email.text, email.html]) {
          expect(part).toContain("123456");
          expect(part).toContain("10");
          expect(part).toContain(NEVER_ASK[locale]);
          expect(part).not.toMatch(/https?:|www\.|<a\b|href=/i);
        }
      });
    }
  }

  it("words the lead line by purpose", () => {
    const leads = Object.values(SIGN_IN_CODE_PURPOSE).map(
      (purpose) =>
        renderSignInCodeEmail({ to: "a@b.co", code: "123456", locale: "en", purpose }).text.split(
          "\n",
        )[0],
    );
    expect(new Set(leads).size).toBe(3);
  });
});
