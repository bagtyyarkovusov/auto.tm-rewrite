import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma.module";
import { IdentityModule } from "../identity/identity.module";

import { CatalogController } from "./presentation/catalog.controller";
import { AdminCatalogController } from "./presentation/AdminCatalogController";
import { ListBrands } from "./application/ListBrands";
import { ListModelsForBrand } from "./application/ListModelsForBrand";
import { ListGenerationsForModel } from "./application/ListGenerationsForModel";
import { ListRegions } from "./application/ListRegions";
import { ListCitiesForRegion } from "./application/ListCitiesForRegion";
import { ListBodyTypes } from "./application/ListBodyTypes";
import { ListColors } from "./application/ListColors";
import { ListDriveTypes } from "./application/ListDriveTypes";
import { ListEngineTypes } from "./application/ListEngineTypes";
import { ListTransmissions } from "./application/ListTransmissions";
import { CreateBrand } from "./application/CreateBrand";
import { UpdateBrand } from "./application/UpdateBrand";
import { DeleteBrand } from "./application/DeleteBrand";
import { CreateModel } from "./application/CreateModel";
import { UpdateModel } from "./application/UpdateModel";
import { DeleteModel } from "./application/DeleteModel";
import { PrismaBrandRepository } from "./infrastructure/PrismaBrandRepository";
import { PrismaModelRepository } from "./infrastructure/PrismaModelRepository";
import { PrismaGenerationRepository } from "./infrastructure/PrismaGenerationRepository";
import { PrismaRegionRepository } from "./infrastructure/PrismaRegionRepository";
import { PrismaCityRepository } from "./infrastructure/PrismaCityRepository";
import { PrismaBodyTypeRepository } from "./infrastructure/PrismaBodyTypeRepository";
import { PrismaColorRepository } from "./infrastructure/PrismaColorRepository";
import { PrismaDriveTypeRepository } from "./infrastructure/PrismaDriveTypeRepository";
import { PrismaEngineTypeRepository } from "./infrastructure/PrismaEngineTypeRepository";
import { PrismaTransmissionRepository } from "./infrastructure/PrismaTransmissionRepository";
import { BRAND_REPOSITORY } from "./domain/ports/BrandRepository";
import { MODEL_REPOSITORY } from "./domain/ports/ModelRepository";
import { GENERATION_REPOSITORY } from "./domain/ports/GenerationRepository";
import { REGION_REPOSITORY } from "./domain/ports/RegionRepository";
import { CITY_REPOSITORY } from "./domain/ports/CityRepository";
import { BODY_TYPE_REPOSITORY } from "./domain/ports/BodyTypeRepository";
import { COLOR_REPOSITORY } from "./domain/ports/ColorRepository";
import { DRIVE_TYPE_REPOSITORY } from "./domain/ports/DriveTypeRepository";
import { ENGINE_TYPE_REPOSITORY } from "./domain/ports/EngineTypeRepository";
import { TRANSMISSION_REPOSITORY } from "./domain/ports/TransmissionRepository";

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [
    PrismaBrandRepository,
    PrismaModelRepository,
    PrismaGenerationRepository,
    PrismaRegionRepository,
    PrismaCityRepository,
    PrismaBodyTypeRepository,
    PrismaColorRepository,
    PrismaDriveTypeRepository,
    PrismaEngineTypeRepository,
    PrismaTransmissionRepository,
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
    {
      provide: REGION_REPOSITORY,
      useClass: PrismaRegionRepository,
    },
    {
      provide: CITY_REPOSITORY,
      useClass: PrismaCityRepository,
    },
    {
      provide: BODY_TYPE_REPOSITORY,
      useClass: PrismaBodyTypeRepository,
    },
    {
      provide: COLOR_REPOSITORY,
      useClass: PrismaColorRepository,
    },
    {
      provide: DRIVE_TYPE_REPOSITORY,
      useClass: PrismaDriveTypeRepository,
    },
    {
      provide: ENGINE_TYPE_REPOSITORY,
      useClass: PrismaEngineTypeRepository,
    },
    {
      provide: TRANSMISSION_REPOSITORY,
      useClass: PrismaTransmissionRepository,
    },
    ListBrands,
    ListModelsForBrand,
    ListGenerationsForModel,
    ListRegions,
    ListCitiesForRegion,
    ListBodyTypes,
    ListColors,
    ListDriveTypes,
    ListEngineTypes,
    ListTransmissions,
    CreateBrand,
    UpdateBrand,
    DeleteBrand,
    CreateModel,
    UpdateModel,
    DeleteModel,
  ],
})
export class CatalogModule {}
