import { Inject, Injectable, Logger, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import {
  BRAND_REPOSITORY,
  type BrandRepository,
} from "../domain/ports/BrandRepository";
import { BRAND_LOGO_STORAGE, type BrandLogoStorage } from "../domain/ports/BrandLogoStorage";
import { CatalogSearchIndex } from "./CatalogSearchIndex";

export interface DeleteBrandInput {
  id: string;
}

@Injectable()
export class DeleteBrand {
  private readonly logger = new Logger(DeleteBrand.name);

  constructor(
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogSearchIndex)
    private readonly searchIndex: CatalogSearchIndex,
    @Inject(BRAND_LOGO_STORAGE) private readonly logoStorage: BrandLogoStorage,
  ) {}

  async execute(input: DeleteBrandInput, actorUserId: string): Promise<void> {
    const brand = await this.brands.getBrandById(input.id);
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    let deleted: { logoKey: string | null } | null;
    try {
      deleted = await this.brands.delete(input.id);
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
    if (!deleted) {
      throw new NotFoundException("Brand not found");
    }
    this.searchIndex.invalidate();

    // The key of the row the delete actually removed, not the earlier read:
    // a logo swapped in between would otherwise be left behind.
    if (deleted.logoKey) {
      try {
        await this.logoStorage.deleteLogoVersion(deleted.logoKey);
      } catch (err) {
        this.logger.warn({ key: deleted.logoKey, err }, "Failed to delete brand logo version");
      }
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
