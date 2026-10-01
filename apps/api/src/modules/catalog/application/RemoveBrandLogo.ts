import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import {
  BRAND_LOGO_REPOSITORY,
  type BrandLogoRepository,
} from "../domain/ports/BrandLogoRepository";
import { BRAND_LOGO_STORAGE, type BrandLogoStorage } from "../domain/ports/BrandLogoStorage";

/**
 * Clears a brand logo in one short database-only swap, then deletes the
 * version directory the swap actually removed (all imported siblings
 * included). Removing a missing logo is a no-op. A failed or uncertain
 * database swap deletes nothing.
 */
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

    const replacement = await this.brands.replaceLogoKey(brand.id, null);
    if (!replacement.replaced) {
      throw new NotFoundException("Brand not found");
    }

    const previousKey = replacement.previousKey;
    if (!previousKey) return;

    try {
      await this.storage.deleteLogoVersion(previousKey);
    } catch (err) {
      this.logger.warn({ key: previousKey, err }, "Failed to delete brand logo version");
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
