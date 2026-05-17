import { Inject, Injectable } from "@nestjs/common";
import type { CatalogSchemas } from "@auto-tm/contracts";

import type { Region } from "../domain/Region";
import {
  REGION_REPOSITORY,
  type RegionRepository,
} from "../domain/ports/RegionRepository";

export interface ListRegionsInput {
  locale: "tk" | "ru" | "en";
}

export interface ListRegionsResult {
  items: CatalogSchemas.RegionSummary[];
}

@Injectable()
export class ListRegions {
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepository,
  ) {}

  async execute(input: ListRegionsInput): Promise<ListRegionsResult> {
    const items = await this.regions.listRegions(input);
    return {
      items: items.map((r) => toRegionSummary(r, input.locale)),
    };
  }
}

function toRegionSummary(
  region: Region,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.RegionSummary {
  const name = getName(region, locale);
  if (name) return { id: region.id, slug: region.slug, name };

  const fallback = region.nameEn || region.nameRu || region.nameTk;
  const fallbackLocale = region.nameEn
    ? "en"
    : region.nameRu
      ? "ru"
      : "tk";
  return {
    id: region.id,
    slug: region.slug,
    name: fallback,
    localeFallback: fallbackLocale,
  };
}

function getName(
  region: Region,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return region.nameTk;
    case "ru":
      return region.nameRu;
    case "en":
      return region.nameEn;
  }
}
