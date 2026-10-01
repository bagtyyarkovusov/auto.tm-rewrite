import { localeTag } from "@/src/i18n/resources";

export interface ListingSpecLineInput {
  mileageKm?: number | null;
  transmissionName?: string;
  engineTypeName?: string;
  locale: string;
  /** Localized mileage unit, e.g. "km". */
  kmLabel: string;
}

/**
 * The "km · gearbox · fuel" line shared by the large Results card and the
 * Listing detail preview, so the preview matches the card it opened from.
 * Missing parts drop out with no placeholder.
 */
export function listingSpecLine({
  mileageKm,
  transmissionName,
  engineTypeName,
  locale,
  kmLabel,
}: ListingSpecLineInput): string {
  return [
    mileageKm != null ? `${mileageKm.toLocaleString(localeTag(locale))} ${kmLabel}` : null,
    transmissionName,
    engineTypeName,
  ]
    .filter(Boolean)
    .join(" · ");
}
