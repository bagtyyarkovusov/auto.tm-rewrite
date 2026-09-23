import type { Metadata } from "next";
import Link from "next/link";

import { trustInfo } from "./content";

import type { Locale } from "@/i18n/locales";
import { defaultLocale, locales } from "@/i18n/locales";

function resolvePageLocale(locale: string): Locale {
  return locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
}

const trustMetaDescription: Record<Locale, string> = {
  tk: "AutoTM howpsuzlyk we ynam baradady",
  ru: "Как AutoTM защищает покупателей",
  en: "How AutoTM keeps buyers safe",
};

const trustFooterEmailPrefix: Record<Locale, string> = {
  tk: "Soraglaryňyz bar bolsa ",
  ru: "Если есть вопросы, напишите нам на ",
  en: "Questions? Reach us at ",
};

const trustBackHomeLabel: Record<Locale, string> = {
  tk: "Baş sahypa gaýdym",
  ru: "Вернуться на главную",
  en: "Back to home",
};

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageLocale = resolvePageLocale(locale);
  const doc = trustInfo[pageLocale];

  return {
    title: `${doc.title} — AutoTM`,
    description: trustMetaDescription[pageLocale],
  };
}

export default async function TrustPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const pageLocale = resolvePageLocale(locale);
  const doc = trustInfo[pageLocale];

  return (
    <main className="mx-auto max-w-5xl px-6 py-14 sm:px-8 md:py-20 lg:py-24">
      <header className="max-w-3xl pb-12 md:pb-16">
        <div
          className="mb-8 h-1 w-12 rounded-full bg-brand-500"
          aria-hidden="true"
        />
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {doc.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl md:leading-9">
          {doc.intro}
        </p>
      </header>

      <ol className="border-y border-border">
        {doc.sections.map((section, index) => (
          <li
            key={section.title}
            className="grid gap-3 border-b border-border py-8 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-8 md:py-10"
          >
            <span
              className="pt-1 text-sm font-semibold tabular-nums text-brand-600"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-7 tracking-tight text-foreground md:text-2xl md:leading-8">
                {section.title}
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
                {section.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="mt-10 flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {trustFooterEmailPrefix[pageLocale]}
          <a
            href="mailto:trust@auto.tm"
            className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand-600 hover:decoration-brand-600"
          >
            trust@auto.tm
          </a>
          .
        </p>
        <p>
          <Link
            href={`/${pageLocale}`}
            className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand-600 hover:decoration-brand-600"
          >
            {trustBackHomeLabel[pageLocale]}
          </Link>
        </p>
      </footer>
    </main>
  );
}
