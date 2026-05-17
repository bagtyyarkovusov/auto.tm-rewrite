import { Inject, Injectable } from "@nestjs/common";
import type { CatalogSchemas } from "@auto-tm/contracts";

import type { Color } from "../domain/Color";
import {
  COLOR_REPOSITORY,
  type ColorRepository,
} from "../domain/ports/ColorRepository";

export interface ListColorsInput {
  locale: "tk" | "ru" | "en";
}

export interface ListColorsResult {
  items: CatalogSchemas.ColorSummary[];
}

@Injectable()
export class ListColors {
  constructor(
    @Inject(COLOR_REPOSITORY) private readonly colors: ColorRepository,
  ) {}

  async execute(input: ListColorsInput): Promise<ListColorsResult> {
    const items = await this.colors.listColors(input);
    return {
      items: items.map((c) => toColorSummary(c, input.locale)),
    };
  }
}

function toColorSummary(
  color: Color,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.ColorSummary {
  const name = getName(color, locale);
  if (name)
    return {
      id: color.id,
      name,
      hex: color.hex ?? undefined,
    };

  const fallback = color.nameEn || color.nameRu || color.nameTk;
  const fallbackLocale = color.nameEn
    ? "en"
    : color.nameRu
      ? "ru"
      : "tk";
  return {
    id: color.id,
    name: fallback,
    hex: color.hex ?? undefined,
    localeFallback: fallbackLocale,
  };
}

function getName(
  color: Color,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return color.nameTk;
    case "ru":
      return color.nameRu;
    case "en":
      return color.nameEn;
  }
}
