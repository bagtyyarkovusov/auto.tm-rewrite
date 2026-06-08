import { Module } from "@nestjs/common";

import { ListingsModule } from "../listings/listings.module";
import { IdentityModule } from "../identity/identity.module";

import { AdminController } from "./presentation/admin.controller";
import { ReportsController } from "./presentation/ReportsController";
import { AuditController } from "./presentation/AuditController";
import { AdminModerationController } from "./presentation/AdminModerationController";
import { CreateReport } from "./application/CreateReport";
import { ListReports } from "./application/ListReports";
import { GetReportDetail } from "./application/GetReportDetail";
import { ListAuditEntries } from "./application/ListAuditEntries";
import { BanListing } from "./application/BanListing";
import { UnbanListing } from "./application/UnbanListing";
import { PrismaContentReportRepository } from "./infrastructure/PrismaContentReportRepository";
import { PrismaAuditLogRepository } from "./infrastructure/PrismaAuditLogRepository";
import { CONTENT_REPORT_REPOSITORY } from "./domain/ports/ContentReportRepository";
import { AUDIT_LOG_REPOSITORY } from "./domain/ports/AuditLogRepository";

@Module({
  imports: [ListingsModule, IdentityModule],
  controllers: [AdminController, ReportsController, AuditController, AdminModerationController],
  providers: [
    PrismaContentReportRepository,
    {
      provide: CONTENT_REPORT_REPOSITORY,
      useClass: PrismaContentReportRepository,
    },
    PrismaAuditLogRepository,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: PrismaAuditLogRepository,
    },
    CreateReport,
    ListReports,
    GetReportDetail,
    ListAuditEntries,
    BanListing,
    UnbanListing,
  ],
})
export class AdminModule {}
