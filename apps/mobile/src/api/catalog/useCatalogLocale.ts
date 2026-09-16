import { useTranslation } from "react-i18next";

import { resolveLocale, type Locale } from "../../i18n/resources";

/**
 * The locale catalog requests are made in: the caller's explicit choice, else
 * the app's active language. Catalog hooks used to default to "ru", so every
 * screen that forgot to pass a locale rendered Russian option names under
 * Turkmen or English labels.
 */
export function useCatalogLocale(override?: Locale): Locale {
  const { i18n } = useTranslation();
  return override ?? resolveLocale(i18n.language);
}
