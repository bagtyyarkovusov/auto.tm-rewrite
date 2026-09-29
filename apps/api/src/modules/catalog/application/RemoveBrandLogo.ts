import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import {
  BRAND_LOGO_REPOSITORY,
  type BrandLogoRepository,
} from "../domain/ports/BrandLogoRepository";
import { BRAND_LOGO_STORAGE, type BrandLogoStorage } from "../domain/ports/BrandLogoStorage";

/** Clears a brand logo and deletes its object. Removing a missing logo is a no-op. */
@Injectable()
export class RemoveBrandLogo {
  private readonly logger = new Logger(RemoveBrandLogo.name);

  constructor(
    @Inject(BRAND_LOGO_REPOSITORY) private readonly brands: BrandLogoRepository,
    @Inject(BRAND_LOGO_STORAGE) private readonly storage: BrandLogoStorage,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: { brandId: string }, actorUserId: string): Promise<void> {
    const brand = await this.brands.getBrandById(input.brandId);
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    const previousKey = brand.logoKey ?? null;
    if (!previousKey) return;

    await this.brands.setLogoKey(brand.id, null);
    try {
      await this.storage.delete(previousKey);
    } catch (err) {
      this.logger.warn({ key: previousKey, err }, "Failed to delete brand logo object");
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "CATALOG_BRAND_LOGO_REMOVE",
        targetType: "Brand",
        targetId: brand.id,
        details: { slug: brand.slug, previousLogoKey: previousKey },
      },
    });
  }
}
