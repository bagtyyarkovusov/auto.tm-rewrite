import { localeTag } from "@/src/i18n/resources";

/**
 * Formats a TMT-denominated price for display.
 *
 * Every price the API exposes to the UI as `displayPriceTmt` is already
 * converted to TMT, so the label is always "TMT" regardless of the listing's
 * original `priceCurrency`.
 */
export function formatPrice(amount: number, locale: string): string {
  return `${amount.toLocaleString(localeTag(locale))} TMT`;
}

/** Formats a TMT price range as "min – max TMT", the unit shown once after the upper bound. */
export function formatPriceRange(min: number, max: number, locale: string): string {
  return `${min.toLocaleString(localeTag(locale))} – ${formatPrice(max, locale)}`;
}
