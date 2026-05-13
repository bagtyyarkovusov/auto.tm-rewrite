import { Button } from "@auto-tm/ui/components";

import type { Locale } from "@/i18n/locales";

const subtitle: Record<Locale, string> = {
  ru: "Автомаркет Туркменистана — покупайте и продавайте автомобили",
  tk: "Türkmenistanyň awtobazary — awtoulaglary satyn alyň we satyň",
  en: "Turkmenistan's auto marketplace — buy and sell cars",
};

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-brand-500">AutoTM</h1>
        <p className="mt-4 text-lg text-neutral-600">
          {subtitle[locale as Locale] ?? subtitle.ru}
        </p>
        <div className="mt-8">
          <Button variant="primary" size="lg">
            {locale === "tk"
              ? "Awtoulaglary görmek"
              : locale === "en"
                ? "Browse listings"
                : "Смотреть объявления"}
          </Button>
        </div>
      </div>
    </main>
  );
}
