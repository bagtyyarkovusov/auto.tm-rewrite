import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import {
  BRAND_LOGO_REJECTION_MESSAGES,
  brandLogoKey,
  checkBrandLogoFile,
  checkBrandLogoImage,
  checkBrandLogoSvgSafety,
  type BrandLogoContentType,
  type BrandLogoRejection,
} from "../domain/BrandLogo";
import {
  BRAND_LOGO_REPOSITORY,
  type BrandLogoRepository,
} from "../domain/ports/BrandLogoRepository";
import { BRAND_LOGO_STORAGE, type BrandLogoStorage } from "../domain/ports/BrandLogoStorage";
import { LOGO_IMAGE_PROBE, type LogoImageProbe } from "../domain/ports/LogoImageProbe";

export interface SetBrandLogoInput {
  brandId: string;
  contentType: string;
  bytes: Uint8Array;
}

export interface SetBrandLogoResult {
  id: string;
  logoUrl: string;
}

/**
 * Uploads or replaces a brand logo. The new object is written first, then the
 * Brand points at it, then the previous object is deleted, so a replaced logo
 * leaves no orphan object in storage.
 */
@Injectable()
export class SetBrandLogo {
  private readonly logger = new Logger(SetBrandLogo.name);

  constructor(
    @Inject(BRAND_LOGO_REPOSITORY) private readonly brands: BrandLogoRepository,
    @Inject(BRAND_LOGO_STORAGE) private readonly storage: BrandLogoStorage,
    @Inject(LOGO_IMAGE_PROBE) private readonly probe: LogoImageProbe,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: SetBrandLogoInput, actorUserId: string): Promise<SetBrandLogoResult> {
    const brand = await this.brands.getBrandById(input.brandId);
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    const contentType = await this.validate(input.contentType, input.bytes);

    const previousKey = brand.logoKey ?? null;
    const key = brandLogoKey(brand.slug, `v${Date.now()}`, contentType);

    await this.storage.put(key, input.bytes, contentType);
    try {
      await this.brands.setLogoKey(brand.id, key);
    } catch (err) {
      await this.deleteQuietly(key);
      throw err;
    }

    if (previousKey && previousKey !== key) {
      await this.deleteQuietly(previousKey);
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "CATALOG_BRAND_LOGO_SET",
        targetType: "Brand",
        targetId: brand.id,
        details: { slug: brand.slug, logoKey: key, previousLogoKey: previousKey },
      },
    });

    return { id: brand.id, logoUrl: this.storage.publicUrl(key) };
  }

  private async validate(contentType: string, bytes: Uint8Array): Promise<BrandLogoContentType> {
    const fileRejection = checkBrandLogoFile(contentType, bytes.byteLength);
    if (fileRejection) reject(fileRejection);
    const accepted = contentType as BrandLogoContentType;

    if (accepted === "image/svg+xml") {
      const svgRejection = checkBrandLogoSvgSafety(new TextDecoder().decode(bytes));
      if (svgRejection) reject(svgRejection);
    }

    const imageRejection = checkBrandLogoImage(accepted, await this.probe.probe(bytes));
    if (imageRejection) reject(imageRejection);

    return accepted;
  }

  // A failed cleanup must not undo a logo change that already succeeded; the
  // key is logged so the stray object can be removed by hand.
  private async deleteQuietly(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (err) {
      this.logger.warn({ key, err }, "Failed to delete brand logo object");
    }
  }
}

function reject(reason: BrandLogoRejection): never {
  throw new BadRequestException({
    code: "VALIDATION_FAILED",
    message: BRAND_LOGO_REJECTION_MESSAGES[reason],
    details: { reason },
  });
}
