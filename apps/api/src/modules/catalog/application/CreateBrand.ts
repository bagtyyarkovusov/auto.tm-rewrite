import { Inject, Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Brand } from "../domain/Brand";
import {
  BRAND_REPOSITORY,
  type BrandRepository,
} from "../domain/ports/BrandRepository";

export interface CreateBrandInput {
  slug: string;
  nameRu: string;
  nameTk: string;
  nameEn: string;
}

@Injectable()
export class CreateBrand {
  constructor(
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateBrandInput, actorUserId: string): Promise<Brand> {
    const existing = await this.brands.getBySlug(input.slug);
    if (existing) {
      throw new ConflictException("Brand with this slug already exists");
    }

    const brand = await this.brands.create(input);

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "CATALOG_BRAND_CREATE",
        targetType: "Brand",
        targetId: brand.id,
        details: { slug: brand.slug, nameRu: brand.nameRu },
      },
    });

    return brand;
  }
}
