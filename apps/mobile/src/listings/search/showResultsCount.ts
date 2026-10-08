import type { TFunction } from "i18next";

import { resolveLocale } from "../../i18n/resources";

/** Count keys must also work on Hermes without Intl.PluralRules. */
export function showResultsCount(t: TFunction, language: string, count: number): string {
  const locale = resolveLocale(language.split("-")[0]);
  let form: "one" | "few" | "many" | "other" = "other";
  if (locale === "ru" && Number.isInteger(count)) {
    const last = Math.abs(count) % 10;
    const lastTwo = Math.abs(count) % 100;
    form = last === 1 && lastTwo !== 11
      ? "one"
      : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
        ? "few"
        : "many";
  } else if (locale === "en" && count === 1) {
    form = "one";
  }
  // Interpolate without the count option, which would invoke i18next's Intl resolver.
  return t(`showResultsCount_${form}`, { replace: { count } });
}
