import type { Metadata } from "next";

import { privacyPolicy } from "../content";
import { LegalPage } from "../LegalPage";

import type { Locale } from "@/i18n/locales";
import { locales } from "@/i18n/locales";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const doc = privacyPolicy[locale as Locale] ?? privacyPolicy.ru;
  return {
    title: `${doc.title} — AutoTM`,
    description:
      locale === "tk"
        ? "AutoTM gizlinlik syýasaty"
        : locale === "ru"
          ? "Политика конфиденциальности AutoTM"
          : "AutoTM Privacy Policy",
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const doc = privacyPolicy[locale as Locale] ?? privacyPolicy.ru;

  return <LegalPage locale={locale as Locale} document={doc} canonicalPath="/legal/privacy" />;
}
