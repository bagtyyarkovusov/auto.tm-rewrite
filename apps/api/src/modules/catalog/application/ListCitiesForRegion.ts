import { Inject, Injectable } from "@nestjs/common";
import type { CatalogSchemas } from "@auto-tm/contracts";

import type { City } from "../domain/City";
import {
  CITY_REPOSITORY,
  type CityRepository,
} from "../domain/ports/CityRepository";

export interface ListCitiesForRegionInput {
  regionId: string;
  locale: "tk" | "ru" | "en";
  cursor?: { name: string; id: string };
  limit?: number;
}

export interface ListCitiesForRegionResult {
  items: CatalogSchemas.CitySummary[];
  nextCursor?: { name: string; id: string } | undefined;
}

@Injectable()
export class ListCitiesForRegion {
  constructor(
    @Inject(CITY_REPOSITORY) private readonly cities: CityRepository,
  ) {}

  async execute(input: ListCitiesForRegionInput): Promise<ListCitiesForRegionResult> {
    const { items, nextCursor } = await this.cities.listCitiesByRegion(input);
    return {
      items: items.map((c) => toCitySummary(c, input.locale)),
      nextCursor,
    };
  }
}

function toCitySummary(
  city: City,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.CitySummary {
  const name = getName(city, locale);
  if (name) return { id: city.id, slug: city.slug, name, regionId: city.regionId };

  const fallback = city.nameEn || city.nameRu || city.nameTk;
  const fallbackLocale = city.nameEn
    ? "en"
    : city.nameRu
      ? "ru"
      : "tk";
  return {
    id: city.id,
    slug: city.slug,
    name: fallback,
    regionId: city.regionId,
    localeFallback: fallbackLocale,
  };
}

function getName(
  city: City,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return city.nameTk;
    case "ru":
      return city.nameRu;
    case "en":
      return city.nameEn;
  }
}
