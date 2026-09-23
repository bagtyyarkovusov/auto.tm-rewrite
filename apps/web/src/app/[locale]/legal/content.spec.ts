import { describe, expect, it } from "vitest";

import type { Locale } from "../../../i18n/locales";
import { locales } from "../../../i18n/locales";

import { privacyPolicy, termsOfService } from "./content";
import type { LegalDocument } from "./content";

type LocalePhrases = Record<Locale, string>;

/** A promise the document makes in every language, with the phrase that carries it. */
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
    name: "collects an email address for sign-in and account management",
    phrases: {
      en: "**Email address** — collected when you choose to sign in by email",
      ru: "**Адрес электронной почты** — если вы выбираете вход по почте",
      tk: "**E-poçta salgysy** — e-poçta arkaly girmegi saýlasaňyz",
    },
  },
  {
    name: "email codes go through a delivery provider in the United States",
    phrases: {
      en: "email delivery provider located in the United States",
      ru: "провайдер email-рассылки, расположенный в США",
      tk: "ABŞ-da ýerleşýän e-poçta eltiş üpjünçisi",
    },
  },
  {
    name: "the provider keeps delivery records for 30 days",
    phrases: {
      en: "keeps delivery records for 30 days",
      ru: "хранит записи о доставке 30 дней",
      tk: "eltiş ýazgylaryny 30 gün saklaýar",
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
    name: "deletion can be requested in the app or on the web deletion page",
    phrases: {
      en: "in the app, or on the account deletion page on our website",
      ru: "в приложении или на странице удаления аккаунта на нашем сайте",
      tk: "programmada ýa-da saýtymyzdaky akkaunt pozmak sahypasynda",
    },
  },
  {
    name: "deletion is confirmed with a code sent to the phone or the email",
    phrases: {
      en: "code sent to the phone number or the email address on the account",
      ru: "кодом, отправленным на номер телефона или адрес почты",
      tk: "telefon belgä ýa-da e-poçta salga iberilen kod bilen tassyklanýar",
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
    name: "the Listing contact phone is collected and confirmed by SMS",
    phrases: {
      en: "**Listing contact phone** — the +993 number you choose to show on a listing",
      ru: "**Контактный телефон объявления** — номер +993",
      tk: "**Bildirişiň habarlaşma belgisi** — bildirişde görkezmek üçin saýlan +993 belgiňiz",
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
      ru: "Прежде чем опубликовать или переопубликовать объявление либо изменить его контактный телефон",
      tk: "Bildirişi çap etmezden, gaýtadan çap etmezden ýa-da onuň habarlaşma belgisini çalyşmazdan öň",
    },
  },
  {
    name: "the contact phone is the account phone or another +993 number confirmed by SMS",
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
    name: "email-only sellers do not need an account phone",
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

describe.each(documents)("%s", (_name, document) => {
  it("has the same sections in every locale", () => {
    const sectionTitles = locales.map((locale) =>
      document[locale].sections.map((section) => section.title.split(".")[0]),
    );
    const [reference, ...rest] = sectionTitles;
    for (const titles of rest) {
      expect(titles).toEqual(reference);
    }
  });

  it("dates the same revision in every locale", () => {
    for (const locale of locales) {
      expect(document[locale].effectiveDateISO).toBe(document.en.effectiveDateISO);
      expect(document[locale].lastRevisedISO).toBe(document.en.lastRevisedISO);
      expect(document[locale].effectiveDateISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(document[locale].lastRevisedISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
      expect(fullText(document[locale])).not.toMatch(/OTP/i);
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
