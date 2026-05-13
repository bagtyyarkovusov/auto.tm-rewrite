import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { locales } from "@/i18n/locales";
import { cn } from "@/lib/utils";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "AutoTM",
  description: "Turkmenistan's auto marketplace — buy and sell cars",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <html
      lang={locale}
      className={cn("h-full antialiased")}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
