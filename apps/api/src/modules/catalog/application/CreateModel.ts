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

export interface CreateModelInput {
  brandId: string;
  slug: string;
  nameRu: string;
  nameTk: string;
  nameEn: string;
}

@Injectable()
export class CreateModel {
  constructor(
    @Inject(MODEL_REPOSITORY) private readonly models: ModelRepository,
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateModelInput, actorUserId: string): Promise<Model> {
    const brand = await this.brands.getBrandById(input.brandId);
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    const existing = await this.models.getByBrandIdAndSlug(
      input.brandId,
      input.slug,
    );
    if (existing) {
      throw new ConflictException(
        "Model with this slug already exists for this brand",
      );
    }

    const model = await this.models.create(input);

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "CATALOG_MODEL_CREATE",
        targetType: "Model",
        targetId: model.id,
        details: { slug: model.slug, nameRu: model.nameRu, brandId: model.brandId },
      },
    });

    return model;
  }
}
