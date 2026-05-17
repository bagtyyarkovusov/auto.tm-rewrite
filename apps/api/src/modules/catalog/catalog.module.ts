import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma.module";
import { CatalogController } from "./presentation/catalog.controller";
import { ListBrands } from "./application/ListBrands";
import { ListModelsForBrand } from "./application/ListModelsForBrand";
import { ListGenerationsForModel } from "./application/ListGenerationsForModel";
import { PrismaBrandRepository } from "./infrastructure/PrismaBrandRepository";
import { PrismaModelRepository } from "./infrastructure/PrismaModelRepository";
import { PrismaGenerationRepository } from "./infrastructure/PrismaGenerationRepository";
import { BRAND_REPOSITORY } from "./domain/ports/BrandRepository";
import { MODEL_REPOSITORY } from "./domain/ports/ModelRepository";
import { GENERATION_REPOSITORY } from "./domain/ports/GenerationRepository";

@Module({
  imports: [PrismaModule],
  controllers: [CatalogController],
  providers: [
    PrismaBrandRepository,
    PrismaModelRepository,
    PrismaGenerationRepository,
    {
      provide: BRAND_REPOSITORY,
      useClass: PrismaBrandRepository,
    },
    {
      provide: MODEL_REPOSITORY,
      useClass: PrismaModelRepository,
    },
    {
      provide: GENERATION_REPOSITORY,
      useClass: PrismaGenerationRepository,
    },
    ListBrands,
    ListModelsForBrand,
    ListGenerationsForModel,
  ],
})
export class CatalogModule {}
