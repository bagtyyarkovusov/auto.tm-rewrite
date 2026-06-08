import { Module } from "@nestjs/common";

import { ListingsModule } from "../listings/listings.module";
import { IdentityModule } from "../identity/identity.module";

import { AdminController } from "./presentation/admin.controller";
import { ReportsController } from "./presentation/ReportsController";
import { CreateReport } from "./application/CreateReport";
import { PrismaContentReportRepository } from "./infrastructure/PrismaContentReportRepository";
import { CONTENT_REPORT_REPOSITORY } from "./domain/ports/ContentReportRepository";

@Module({
  imports: [ListingsModule, IdentityModule],
  controllers: [AdminController, ReportsController],
  providers: [
    PrismaContentReportRepository,
    {
      provide: CONTENT_REPORT_REPOSITORY,
      useClass: PrismaContentReportRepository,
    },
    CreateReport,
  ],
})
export class AdminModule {}
