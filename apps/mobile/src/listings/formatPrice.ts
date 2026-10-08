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

/**
 * A price field's text while the user types: the amount grouped exactly as
 * `formatPrice` groups a displayed price, without the currency. The stored and
 * sent value stays the plain number; only the field's text is grouped.
 */
export function formatAmountInput(amount: number | null | undefined, locale: string): string {
  return amount == null ? "" : amount.toLocaleString(localeTag(locale));
}

/**
 * Reads a typed or pasted price back to a whole number. Spaces, grouping
 * separators and a currency label are dropped ("2 329 600 TMT", "2,329,600"),
 * and so is a pasted decimal part of one or two digits ("185,000.50").
 */
export function parseAmountInput(text: string): number | undefined {
  const digits = text.replace(/[.,]\d{1,2}(?=\D*$)/, "").replace(/\D/g, "");
  return digits === "" ? undefined : parseInt(digits, 10);
}

/** Formats a TMT price range as "min – max TMT", the unit shown once after the upper bound. */
export function formatPriceRange(min: number, max: number, locale: string): string {
  return `${min.toLocaleString(localeTag(locale))} – ${formatPrice(max, locale)}`;
}
