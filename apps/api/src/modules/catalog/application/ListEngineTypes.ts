import { Inject, Injectable } from "@nestjs/common";
import type { CatalogSchemas } from "@auto-tm/contracts";

import type { EngineType } from "../domain/EngineType";
import {
  ENGINE_TYPE_REPOSITORY,
  type EngineTypeRepository,
} from "../domain/ports/EngineTypeRepository";

export interface ListEngineTypesInput {
  locale: "tk" | "ru" | "en";
}

export interface ListEngineTypesResult {
  items: CatalogSchemas.EngineTypeSummary[];
}

@Injectable()
export class ListEngineTypes {
  constructor(
    @Inject(ENGINE_TYPE_REPOSITORY)
    private readonly engineTypes: EngineTypeRepository,
  ) {}

  async execute(input: ListEngineTypesInput): Promise<ListEngineTypesResult> {
    const items = await this.engineTypes.listEngineTypes(input);
    return {
      items: items.map((et) => toEngineTypeSummary(et, input.locale)),
    };
  }
}

function toEngineTypeSummary(
  engineType: EngineType,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.EngineTypeSummary {
  const name = getName(engineType, locale);
  if (name) return { id: engineType.id, name };

  const fallback = engineType.nameEn || engineType.nameRu || engineType.nameTk;
  const fallbackLocale = engineType.nameEn
    ? "en"
    : engineType.nameRu
      ? "ru"
      : "tk";
  return {
    id: engineType.id,
    name: fallback,
    localeFallback: fallbackLocale,
  };
}

function getName(
  engineType: EngineType,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return engineType.nameTk;
    case "ru":
      return engineType.nameRu;
    case "en":
      return engineType.nameEn;
  }
}
