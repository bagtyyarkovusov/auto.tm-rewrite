import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { formatPrice } from "../formatPrice";

import { localeTag } from "@/src/i18n/resources";

type GridCardListing = Pick<
  ListingsSchemas.ListingSummary,
  "displayPriceTmt" | "year" | "condition" | "mileageKm"
>;

export interface ListingGridCardTextInput {
  listing: GridCardListing;
  brandName?: string;
  modelName?: string;
  locale: string;
  /** Localized "New", shown instead of mileage for new cars. */
  newLabel: string;
  /** Localized mileage unit, e.g. "km". */
  kmLabel: string;
}

export interface ListingGridCardText {
  price: string;
  /** "Brand Model"; `null` while neither catalog name has resolved. */
  title: string | null;
  /** "year, km" or "year, New"; `null` when the Listing has neither. */
  meta: string | null;
}

/**
 * The Home grid card text (32 — Listings, Cards): price in TMT, "Brand Model"
 * with no generation, and "year, km" ("year, New" for new cars). Missing
 * parts drop out with no placeholder. City, gearbox, fuel, date and badges
 * are deliberately absent; they belong to the large Results card.
 */
export function listingGridCardText({
  listing,
  brandName,
  modelName,
  locale,
  newLabel,
  kmLabel,
}: ListingGridCardTextInput): ListingGridCardText {
  const title = [brandName, modelName].filter(Boolean).join(" ");

  const usage =
    listing.condition === Enums.ListingCondition.New
      ? newLabel
      : listing.mileageKm !== undefined
        ? `${listing.mileageKm.toLocaleString(localeTag(locale))} ${kmLabel}`
        : null;

  const meta = [listing.year !== undefined ? String(listing.year) : null, usage]
    .filter(Boolean)
    .join(", ");

  return {
    price: formatPrice(listing.displayPriceTmt, locale),
    title: title.length > 0 ? title : null,
    meta: meta.length > 0 ? meta : null,
  };
}
