import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import {
  BRAND_REPOSITORY,
  type BrandRepository,
} from "../domain/ports/BrandRepository";

export interface DeleteBrandInput {
  id: string;
}

@Injectable()
export class DeleteBrand {
  constructor(
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: DeleteBrandInput, actorUserId: string): Promise<void> {
    const brand = await this.brands.getBrandById(input.id);
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    try {
      await this.brands.delete(input.id);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("foreign key constraint")
      ) {
        throw new ConflictException(
          "Cannot delete brand because it has associated models",
        );
      }
      throw err;
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "CATALOG_BRAND_DELETE",
        targetType: "Brand",
        targetId: brand.id,
        details: { slug: brand.slug, nameRu: brand.nameRu },
      },
    });
  }
}
