import { Inject, Injectable } from "@nestjs/common";
import type { Model } from "../domain/Model";
import {
  MODEL_REPOSITORY,
  type ModelRepository,
} from "../domain/ports/ModelRepository";
import type { CatalogSchemas } from "@auto-tm/contracts";

export interface ListModelsForBrandInput {
  brandId: string;
  locale: "tk" | "ru" | "en";
  cursor?: { name: string; id: string };
  limit?: number;
}

export interface ListModelsForBrandResult {
  items: CatalogSchemas.ModelSummary[];
  nextCursor?: { name: string; id: string } | undefined;
}

@Injectable()
export class ListModelsForBrand {
  constructor(
    @Inject(MODEL_REPOSITORY) private readonly models: ModelRepository,
  ) {}

  async execute(input: ListModelsForBrandInput): Promise<ListModelsForBrandResult> {
    const { items, nextCursor } = await this.models.listModelsByBrand(input);
    return {
      items: items.map((m) => toModelSummary(m, input.locale)),
      nextCursor,
    };
  }
}

function toModelSummary(
  model: Model,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.ModelSummary {
  const name = getName(model, locale);
  if (name) return { id: model.id, slug: model.slug, name, brandId: model.brandId };

  const fallback = model.nameEn || model.nameRu || model.nameTk;
  const fallbackLocale = model.nameEn
    ? "en"
    : model.nameRu
      ? "ru"
      : "tk";
  return {
    id: model.id,
    slug: model.slug,
    name: fallback,
    brandId: model.brandId,
    localeFallback: fallbackLocale,
  };
}

function getName(
  model: Model,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return model.nameTk;
    case "ru":
      return model.nameRu;
    case "en":
      return model.nameEn;
  }
}
