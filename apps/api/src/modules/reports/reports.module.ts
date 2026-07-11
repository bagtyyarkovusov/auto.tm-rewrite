import { Module } from "@nestjs/common";

import { ListingsModule } from "../listings/listings.module";
import { IdentityModule } from "../identity/identity.module";

import { ReportsController } from "./presentation/reports.controller";
import { CreateInspectionInterest } from "./application/CreateInspectionInterest";
import { ListInspectionInterestStats } from "./application/ListInspectionInterestStats";
import { PrismaInspectionInterestRepository } from "./infrastructure/PrismaInspectionInterestRepository";
import { INSPECTION_INTEREST_REPOSITORY } from "./domain/ports/InspectionInterestRepository";

@Module({
  imports: [ListingsModule, IdentityModule],
  controllers: [ReportsController],
  providers: [
    PrismaInspectionInterestRepository,
    {
      provide: INSPECTION_INTEREST_REPOSITORY,
      useClass: PrismaInspectionInterestRepository,
    },
    CreateInspectionInterest,
    ListInspectionInterestStats,
  ],
})
export class ReportsModule {}
