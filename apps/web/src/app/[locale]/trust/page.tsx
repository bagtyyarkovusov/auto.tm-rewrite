import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  Search,
  Shield,
  Smartphone,
  Wrench,
} from "lucide-react";
import { Card, CardHeader } from "@auto-tm/ui/components";

import { trustInfo, type TrustSection } from "./content";

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
  const doc = trustInfo[locale as Locale] ?? trustInfo.ru;

  return {
    title: `${doc.title} — AutoTM`,
    description:
      locale === "tk"
        ? "AutoTM howpsuzlyk we ynam baradady"
        : locale === "ru"
          ? "Как AutoTM защищает покупателей"
          : "How AutoTM keeps buyers safe",
  };
}

const iconMap = {
  shield: Shield,
  phone: Smartphone,
  clipboard: ClipboardList,
  search: Search,
  wrench: Wrench,
  alert: AlertTriangle,
};

function TrustSectionCard({ section }: { section: TrustSection }) {
  const Icon = iconMap[section.icon];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="rounded-full bg-brand-500/10 p-3">
          <Icon className="size-6 text-brand-500" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground">
            {section.title}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            {section.body}
          </p>
        </div>
      </CardHeader>
    </Card>
  );
}

export default async function TrustPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const doc = trustInfo[locale as Locale] ?? trustInfo.ru;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <header className="mb-10">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-brand-500/10 p-3">
          <Shield className="size-8 text-brand-500" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {doc.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{doc.intro}</p>
      </header>

      <div className="space-y-6">
        {doc.sections.map((section, index) => (
          <TrustSectionCard key={index} section={section} />
        ))}
      </div>

      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        <p>
          {locale === "tk"
            ? "Soraglaryňyz bar bolsa "
            : locale === "ru"
              ? "Если есть вопросы, напишите нам на "
              : "Questions? Reach us at "}
          <a
            href="mailto:trust@auto.tm"
            className="text-brand-600 underline hover:text-brand-700"
          >
            trust@auto.tm
          </a>
          .
        </p>
        <p className="mt-4">
          <Link
            href={`/${locale}`}
            className="text-brand-600 underline hover:text-brand-700"
          >
            {locale === "tk"
              ? "Baş sahypa gaýdym"
              : locale === "ru"
                ? "Вернуться на главную"
                : "Back to home"}
          </Link>
        </p>
      </footer>
    </main>
  );
}
