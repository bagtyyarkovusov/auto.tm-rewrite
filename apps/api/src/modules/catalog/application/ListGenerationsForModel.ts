import { Inject, Injectable } from "@nestjs/common";
import type { Generation } from "../domain/Generation";
import {
  GENERATION_REPOSITORY,
  type GenerationRepository,
} from "../domain/ports/GenerationRepository";
import type { CatalogSchemas } from "@auto-tm/contracts";

export interface ListGenerationsForModelInput {
  modelId: string;
  locale: "tk" | "ru" | "en";
}

export interface ListGenerationsForModelResult {
  items: CatalogSchemas.GenerationSummary[];
}

@Injectable()
export class ListGenerationsForModel {
  constructor(
    @Inject(GENERATION_REPOSITORY)
    private readonly generations: GenerationRepository,
  ) {}

  async execute(
    input: ListGenerationsForModelInput,
  ): Promise<ListGenerationsForModelResult> {
    const items = await this.generations.listGenerationsByModel(input);
    return {
      items: items.map((g) => toGenerationSummary(g, input.locale)),
    };
  }
}

function toGenerationSummary(
  generation: Generation,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.GenerationSummary {
  const name = getName(generation, locale);
  if (name)
    return {
      id: generation.id,
      name,
      modelId: generation.modelId,
      yearStart: generation.yearStart ?? undefined,
      yearEnd: generation.yearEnd ?? undefined,
    };

  const fallback =
    generation.nameEn || generation.nameRu || generation.nameTk;
  const fallbackLocale = generation.nameEn
    ? "en"
    : generation.nameRu
      ? "ru"
      : "tk";
  return {
    id: generation.id,
    name: fallback,
    modelId: generation.modelId,
    yearStart: generation.yearStart ?? undefined,
    yearEnd: generation.yearEnd ?? undefined,
    localeFallback: fallbackLocale,
  };
}

function getName(
  generation: Generation,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return generation.nameTk;
    case "ru":
      return generation.nameRu;
    case "en":
      return generation.nameEn;
  }
}
