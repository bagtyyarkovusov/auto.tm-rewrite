import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import {
  MODEL_REPOSITORY,
  type ModelRepository,
} from "../domain/ports/ModelRepository";
import { CatalogSearchIndex } from "./CatalogSearchIndex";

export interface DeleteModelInput {
  id: string;
}

@Injectable()
export class DeleteModel {
  constructor(
    @Inject(MODEL_REPOSITORY) private readonly models: ModelRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogSearchIndex)
    private readonly searchIndex: CatalogSearchIndex,
  ) {}

  async execute(input: DeleteModelInput, actorUserId: string): Promise<void> {
    const model = await this.models.getModelById(input.id);
    if (!model) {
      throw new NotFoundException("Model not found");
    }

    try {
      await this.models.delete(input.id);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("foreign key constraint")
      ) {
        throw new ConflictException(
          "Cannot delete model because it has associated generations or listings",
        );
      }
      throw err;
    }
    this.searchIndex.invalidate();

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "CATALOG_MODEL_DELETE",
        targetType: "Model",
        targetId: model.id,
        details: { slug: model.slug, nameRu: model.nameRu, brandId: model.brandId },
      },
    });
  }
}
