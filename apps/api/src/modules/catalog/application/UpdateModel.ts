import { Inject, Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Model } from "../domain/Model";
import {
  MODEL_REPOSITORY,
  type ModelRepository,
} from "../domain/ports/ModelRepository";
import {
  BRAND_REPOSITORY,
  type BrandRepository,
} from "../domain/ports/BrandRepository";

export interface UpdateModelInput {
  id: string;
  brandId?: string | undefined;
  slug?: string | undefined;
  nameRu?: string | undefined;
  nameTk?: string | undefined;
  nameEn?: string | undefined;
}

@Injectable()
export class UpdateModel {
  constructor(
    @Inject(MODEL_REPOSITORY) private readonly models: ModelRepository,
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateModelInput, actorUserId: string): Promise<Model> {
    const model = await this.models.getModelById(input.id);
    if (!model) {
      throw new NotFoundException("Model not found");
    }

    const nextBrandId = input.brandId ?? model.brandId;
    const nextSlug = input.slug ?? model.slug;

    if (nextBrandId !== model.brandId) {
      const brand = await this.brands.getBrandById(nextBrandId);
      if (!brand) {
        throw new NotFoundException("Brand not found");
      }
    }

    if (nextBrandId !== model.brandId || nextSlug !== model.slug) {
      const existing = await this.models.getByBrandIdAndSlug(
        nextBrandId,
        nextSlug,
      );
      if (existing && existing.id !== input.id) {
        throw new ConflictException(
          "Model with this slug already exists for this brand",
        );
      }
    }

    const updated = await this.models.update(input.id, {
      ...(input.brandId !== undefined && { brandId: input.brandId }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.nameRu !== undefined && { nameRu: input.nameRu }),
      ...(input.nameTk !== undefined && { nameTk: input.nameTk }),
      ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "CATALOG_MODEL_UPDATE",
        targetType: "Model",
        targetId: updated.id,
        details: { slug: updated.slug, nameRu: updated.nameRu, brandId: updated.brandId },
      },
    });

    return updated;
  }
}
