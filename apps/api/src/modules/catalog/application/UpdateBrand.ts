import { Inject, Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Brand } from "../domain/Brand";
import {
  BRAND_REPOSITORY,
  type BrandRepository,
} from "../domain/ports/BrandRepository";

export interface UpdateBrandInput {
  id: string;
  slug?: string | undefined;
  nameRu?: string | undefined;
  nameTk?: string | undefined;
  nameEn?: string | undefined;
}

@Injectable()
export class UpdateBrand {
  constructor(
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateBrandInput, actorUserId: string): Promise<Brand> {
    const brand = await this.brands.getBrandById(input.id);
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    if (input.slug && input.slug !== brand.slug) {
      const existing = await this.brands.getBySlug(input.slug);
      if (existing) {
        throw new ConflictException("Brand with this slug already exists");
      }
    }

    const updated = await this.brands.update(input.id, {
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.nameRu !== undefined && { nameRu: input.nameRu }),
      ...(input.nameTk !== undefined && { nameTk: input.nameTk }),
      ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "CATALOG_BRAND_UPDATE",
        targetType: "Brand",
        targetId: updated.id,
        details: { slug: updated.slug, nameRu: updated.nameRu },
      },
    });

    return updated;
  }
}
