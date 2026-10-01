import type { ListingsSchemas } from "@auto-tm/contracts";

import { localeTag } from "../../i18n/resources";

import type { CatalogMaps } from "./useCatalogMaps";

export function listingTitle(
  listing: ListingsSchemas.ListingDetail,
  maps: CatalogMaps,
  generation = true,
) {
  const name = [
    maps.brandName(listing.brandId),
    maps.modelName(listing.modelId),
    generation && listing.generationId
      ? maps.generationName(listing.generationId)
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  return [name, listing.year].filter(Boolean).join(", ");
}

export function detailDate(iso: string | undefined, locale: string) {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(date.getUTCFullYear() !== new Date().getUTCFullYear()
      ? ({ year: "numeric" } as const)
      : {}),
  }).formatToParts(date);
  return ["day", "month", "year"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .filter(Boolean)
    .join(" ");
}
