import { Inject, Injectable } from "@nestjs/common";
import type { Brand } from "../domain/Brand";
import {
  BRAND_REPOSITORY,
  type BrandRepository,
} from "../domain/ports/BrandRepository";
import type { CatalogSchemas } from "@auto-tm/contracts";

export interface ListBrandsInput {
  locale: "tk" | "ru" | "en";
  cursor?: { name: string; id: string };
  limit?: number;
}

export interface ListBrandsResult {
  items: CatalogSchemas.BrandSummary[];
  nextCursor?: { name: string; id: string } | undefined;
}

@Injectable()
export class ListBrands {
  constructor(
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
  ) {}

  async execute(input: ListBrandsInput): Promise<ListBrandsResult> {
    const { items, nextCursor } = await this.brands.listBrands(input);
    return {
      items: items.map((b) => toBrandSummary(b, input.locale)),
      nextCursor,
    };
  }
}

function toBrandSummary(
  brand: Brand,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.BrandSummary {
  const name = getName(brand, locale);
  if (name) return { id: brand.id, slug: brand.slug, name };

  const fallback = brand.nameEn || brand.nameRu || brand.nameTk;
  const fallbackLocale = brand.nameEn
    ? "en"
    : brand.nameRu
      ? "ru"
      : "tk";
  return {
    id: brand.id,
    slug: brand.slug,
    name: fallback,
    localeFallback: fallbackLocale,
  };
}

function getName(
  brand: Brand,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return brand.nameTk;
    case "ru":
      return brand.nameRu;
    case "en":
      return brand.nameEn;
  }
}
