import { Inject, Injectable } from "@nestjs/common";
import type { CatalogSchemas } from "@auto-tm/contracts";

import type { BodyType } from "../domain/BodyType";
import {
  BODY_TYPE_REPOSITORY,
  type BodyTypeRepository,
} from "../domain/ports/BodyTypeRepository";

export interface ListBodyTypesInput {
  locale: "tk" | "ru" | "en";
}

export interface ListBodyTypesResult {
  items: CatalogSchemas.BodyTypeSummary[];
}

@Injectable()
export class ListBodyTypes {
  constructor(
    @Inject(BODY_TYPE_REPOSITORY) private readonly bodyTypes: BodyTypeRepository,
  ) {}

  async execute(input: ListBodyTypesInput): Promise<ListBodyTypesResult> {
    const items = await this.bodyTypes.listBodyTypes(input);
    return {
      items: items.map((b) => toBodyTypeSummary(b, input.locale)),
    };
  }
}

function toBodyTypeSummary(
  bodyType: BodyType,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.BodyTypeSummary {
  const name = getName(bodyType, locale);
  if (name) return { id: bodyType.id, name };

  const fallback = bodyType.nameEn || bodyType.nameRu || bodyType.nameTk;
  const fallbackLocale = bodyType.nameEn
    ? "en"
    : bodyType.nameRu
      ? "ru"
      : "tk";
  return {
    id: bodyType.id,
    name: fallback,
    localeFallback: fallbackLocale,
  };
}

function getName(
  bodyType: BodyType,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return bodyType.nameTk;
    case "ru":
      return bodyType.nameRu;
    case "en":
      return bodyType.nameEn;
  }
}
