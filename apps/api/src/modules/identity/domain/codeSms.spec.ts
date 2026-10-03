import { describe, expect, it } from "vitest";

import { renderCodeSms } from "./codeSms";

const CODE = "123456";

/** GSM-7 basic set without the escape table; anything else forces UCS-2. */
const GSM7 = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà]*$/;

function contactPhone(locale: "ru" | "tk" | "en"): string {
  return renderCodeSms({ purpose: "listing-contact-phone", locale, code: CODE });
}

describe("renderCodeSms for a contact phone (ADR-0081)", () => {
  it("renders the approved Russian text in one UCS-2 segment of 70", () => {
    const text = contactPhone("ru");
    expect(text).toBe("AutoTM 123456: номер покажут в объявлении. Не давайте код без согласия");
    expect([...text]).toHaveLength(70);
    expect(GSM7.test(text)).toBe(false);
  });

  it("renders the approved Turkmen text in one UCS-2 segment", () => {
    const text = contactPhone("tk");
    expect(text).toBe("AutoTM 123456: belgiňiz bildirişde görüner. Razy bolmasaňyz bermäň");
    expect([...text]).toHaveLength(66);
    expect(GSM7.test(text)).toBe(false);
  });

  it("renders the English text in one GSM-7 segment", () => {
    const text = contactPhone("en");
    expect(text).toBe(
      "AutoTM code 123456 puts this number on a car listing. Share it only if you agree.",
    );
    expect([...text]).toHaveLength(81);
    expect(GSM7.test(text)).toBe(true);
  });

  it.each(["ru", "tk", "en"] as const)("puts the code in place and carries no link (%s)", (locale) => {
    const text = renderCodeSms({ purpose: "listing-contact-phone", locale, code: "987654" });
    expect(text).toContain("987654");
    expect(text).not.toContain(CODE);
    expect(text).not.toMatch(/https?:|www\.|\.(com|tm|ru)\b/i);
  });

  it.each(["sign-in", "sign-in-method", "account-deletion"] as const)(
    "sets no wording for %s: the body is the bare code",
    (purpose) => {
      expect(renderCodeSms({ purpose, locale: "ru", code: CODE })).toBe(CODE);
    },
  );
});
