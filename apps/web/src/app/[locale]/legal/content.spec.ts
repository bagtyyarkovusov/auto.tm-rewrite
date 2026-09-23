import { describe, expect, it } from "vitest";

import type { LegalDocument } from "./content";
import { privacyPolicy, termsOfService } from "./content";

import type { Locale } from "@/i18n/locales";
import { locales } from "@/i18n/locales";

type LocalePhrases = Record<Locale, string>;

/**
 * A promise the document makes in every language, with the phrase that carries it.
 *
 * The phrases are deliberately exact: these documents are what users agree to, so
 * rewording a material promise should fail here and force a re-read in all three
 * languages rather than pass silently in one.
 */
interface CopyPromise {
  name: string;
  phrases: LocalePhrases;
}

const documents: [string, Record<Locale, LegalDocument>][] = [
  ["privacy policy", privacyPolicy],
  ["terms of service", termsOfService],
];

const privacyPromises: CopyPromise[] = [
  {
    name: "collects a phone number to create an account or sign in with an SMS code",
    phrases: {
      en: "used to create or sign in to your account with a code sent by SMS",
      ru: "для создания аккаунта или входа по коду из SMS",
      tk: "SMS arkaly gelen kod bilen akkaunt döretmek ýa-da girmek üçin",
    },
  },
  {
    name: "collects an email address for sign-in and account management",
    phrases: {
      en: "collected when you choose to sign in by email, or when you add or change an email address on your account",
      ru: "если вы выбираете вход по почте либо добавляете или меняете почту в аккаунте",
      tk: "e-poçta arkaly girmegi saýlasaňyz ýa-da akkauntyňyza e-poçta goşsaňyz ýa-da çalyşsaňyz",
    },
  },
  {
    name: "email codes go through a delivery provider in the United States",
    phrases: {
      en: "email delivery provider located in the United States",
      ru: "сторонний почтовый сервис, расположенный в США",
      tk: "ABŞ-da ýerleşýän e-poçta eltiş üpjünçisi",
    },
  },
  {
    name: "the provider keeps the address and the message for 30 days",
    phrases: {
      en: "and keeps them for 30 days",
      ru: "а также хранит их 30 дней",
      tk: "olary 30 gün saklaýar",
    },
  },
  {
    name: "AutoTM adds no email tracking",
    phrases: {
      en: "tracked links to the emails we send you",
      ru: "трекинговые пиксели и отслеживаемые ссылки",
      tk: "yzarlanýan salgy goşmaýarys",
    },
  },
  {
    name: "authenticated deletion is available in the app settings",
    phrases: {
      en: "request account deletion from the app settings",
      ru: "удалить его можно в настройках приложения",
      tk: "ony programmanyň sazlamalarynda pozup bilersiňiz",
    },
  },
  {
    name: "public web deletion is confirmed with a phone or email code",
    phrases: {
      en: "enter a phone number or email address on the account and confirm the request with a code sent to it",
      ru: "укажите номер телефона или адрес почты из аккаунта и подтвердите запрос кодом",
      tk: "akkauntdaky telefon belgini ýa-da e-poçta salgysyny giriziň",
    },
  },
  {
    name: "the purge frees both the phone number and the email address",
    phrases: {
      en: "your phone number and email address are freed",
      ru: "номер телефона и адрес почты освобождаются",
      tk: "telefon belgisi we e-poçta salgysy boşadylýar",
    },
  },
  {
    name: "the Listing contact phone is collected and is always SMS-confirmed",
    phrases: {
      en: "the +993 number you choose to show on a listing. It is always a number confirmed by an SMS code",
      ru: "номер +993, который вы показываете в объявлении. Это всегда номер, подтверждённый кодом из SMS",
      tk: "bildirişde görkezmek üçin saýlan +993 belgiňiz. Ol hemişe SMS kody bilen tassyklanan belgidir",
    },
  },
  {
    name: "the Listing contact phone is public",
    phrases: {
      en: "the contact phone you chose for a listing",
      ru: "контактный телефон, выбранный для объявления",
      tk: "bildiriş üçin saýlanan habarlaşma belgisi",
    },
  },
];

const termsPromises: CopyPromise[] = [
  {
    name: "sign-in uses a code sent to a phone number or an email address",
    phrases: {
      en: "code sent to your phone number or to your email address",
      ru: "по коду, который приходит на ваш номер телефона или на адрес электронной почты",
      tk: "telefon belgiňize ýa-da e-poçta salgyňyza iberilen kod bilen girýärsiňiz",
    },
  },
  {
    name: "publishing, republishing, or changing the contact phone needs a verified number",
    phrases: {
      en: "Before you publish or republish a listing, or change its contact phone",
      ru: "Прежде чем вы опубликуете или переопубликуете объявление либо измените его контактный телефон",
      tk: "Bildirişi çap etmezden, gaýtadan çap etmezden ýa-da onuň habarlaşma belgisini çalyşmazdan öň",
    },
  },
  {
    name: "the contact phone uses a verified phone Sign-in Method or another +993 number confirmed by SMS",
    phrases: {
      en: "another +993 number you confirm with a code sent to it by SMS for this purpose",
      ru: "другой номер +993, который вы подтверждаете кодом, отправленным на него по SMS для этой цели",
      tk: "SMS arkaly iberilen kod bilen tassyklaýan başga bir +993 belgiňizdir",
    },
  },
  {
    name: "verifying a contact phone does not make it a Sign-in Method",
    phrases: {
      en: "it does not make that number a way to sign in to your account",
      ru: "оно не делает этот номер способом входа в аккаунт",
      tk: "ol belgi akkaunta girmegiň usulyna öwrülmeýär",
    },
  },
  {
    name: "email-only sellers do not need a phone Sign-in Method",
    phrases: {
      en: "If your account has no phone number, you do not need to add one",
      ru: "Если в аккаунте нет номера телефона, добавлять его не нужно",
      tk: "Akkauntyňyzda telefon belgisi ýok bolsa, goşmak hökman däl",
    },
  },
  {
    name: "transactional messages cover sign-in codes and contact-phone codes",
    phrases: {
      en: "sign-in codes sent by SMS or email, codes that confirm a listing contact phone",
      ru: "коды входа по SMS или электронной почте, коды подтверждения контактного телефона объявления",
      tk: "SMS ýa-da e-poçta arkaly gelýän giriş kodlary, bildirişiň habarlaşma belgisini tassyklaýan kodlar",
    },
  },
  {
    name: "deletion works in the app or on the website with a phone or an email",
    phrases: {
      en: "requesting deletion on our website with the phone number or email address on your account",
      ru: "запросить удаление на нашем сайте, указав номер телефона или адрес почты из аккаунта",
      tk: "saýtymyzda akkauntyňyzdaky telefon belgisi ýa-da e-poçta salgysy bilen pozmagy sorap bilersiňiz",
    },
  },
  {
    name: "recovery works with either Sign-in Method",
    phrases: {
      en: "signing in again with either your phone number or your email address",
      ru: "войдя снова по номеру телефона или по адресу почты",
      tk: "telefon belgiňiz ýa-da e-poçta salgyňyz bilen gaýtadan girip",
    },
  },
];

function fullText(document: LegalDocument) {
  return document.sections.map((section) => `${section.title}\n${section.body}`).join("\n\n");
}

/**
 * The displayed date is hand-written per locale, so it can only be checked against
 * the machine-readable one by the parts every locale spells with digits.
 */
function expectDisplayToMatchISO(display: string, iso: string) {
  const [year, , day] = iso.split("-");
  expect(display).toContain(year);
  expect(display).toMatch(new RegExp(`(^|\\D)${Number(day)}(\\D|$)`));
}

describe.each(documents)("%s", (_name, document) => {
  it("numbers sections identically in every locale", () => {
    for (const locale of locales) {
      expect(document[locale].sections).toHaveLength(document.en.sections.length);
      expect(document[locale].sections.map((section) => section.title.split(".")[0])).toEqual(
        document.en.sections.map((section) => section.title.split(".")[0]),
      );
    }
  });

  it("dates the same revision in every locale", () => {
    for (const locale of locales) {
      const { effectiveDate, effectiveDateISO, lastRevised, lastRevisedISO } = document[locale];

      expect(effectiveDateISO).toBe(document.en.effectiveDateISO);
      expect(lastRevisedISO).toBe(document.en.lastRevisedISO);
      expect(effectiveDateISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(lastRevisedISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expectDisplayToMatchISO(effectiveDate, effectiveDateISO);
      expectDisplayToMatchISO(lastRevised, lastRevisedISO);
    }
  });

  it("keeps every section non-empty in every locale", () => {
    for (const locale of locales) {
      for (const section of document[locale].sections) {
        expect(section.title.trim()).not.toBe("");
        expect(section.body.trim()).not.toBe("");
      }
    }
  });

  it("uses no internal sign-in vocabulary", () => {
    for (const locale of locales) {
      expect(fullText(document[locale])).not.toMatch(/\bOTPs?\b/i);
    }
  });
});

describe("privacy policy promises", () => {
  it.each(privacyPromises)("states in every locale that it $name", ({ phrases }) => {
    for (const locale of locales) {
      expect(fullText(privacyPolicy[locale])).toContain(phrases[locale]);
    }
  });
});

describe("terms of service promises", () => {
  it.each(termsPromises)("states in every locale that $name", ({ phrases }) => {
    for (const locale of locales) {
      expect(fullText(termsOfService[locale])).toContain(phrases[locale]);
    }
  });
});
