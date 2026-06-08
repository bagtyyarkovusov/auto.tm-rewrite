import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import { AdminSchemas } from "@auto-tm/contracts";

import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import { CONTENT_REPORT_REPOSITORY } from "../domain/ports/ContentReportRepository";
import type { AuditLogRepository } from "../domain/ports/AuditLogRepository";
import { AUDIT_LOG_REPOSITORY } from "../domain/ports/AuditLogRepository";

export interface DismissReportInput {
  reportId: string;
  adminUserId: string;
  reason: string;
}

export interface DismissReportResult {
  reportId: string;
  status: "dismissed";
  reviewedAt: string;
  auditLogId: string;
}

@Injectable()
export class DismissReport {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reportRepo: ContentReportRepository,
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: AuditLogRepository,
  ) {}

  async execute(input: DismissReportInput): Promise<DismissReportResult> {
    const report = await this.reportRepo.findById(input.reportId);

    if (!report) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Report not found",
      });
    }

    if (report.status !== "pending") {
      throw new ConflictException({
        code: "CONFLICT",
        message: "Report has already been resolved",
        details: {
          reason: AdminSchemas.AdminErrorReason.ReportAlreadyResolved,
          reportStatus: report.status,
        },
      });
    }

    const reviewedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      await this.reportRepo.updateStatus(
        report.id,
        {
          status: "dismissed",
          reviewedById: input.adminUserId,
          reviewedAt,
        },
        tx,
      );

      const auditRow = await this.auditRepo.create(
        {
          actorId: input.adminUserId,
          action: AdminSchemas.AdminAuditAction.ContentReportResolve,
          targetType: "content_report",
          targetId: report.id,
          details: {
            reason: input.reason,
            reportedTargetType: report.targetType,
            reportedTargetId: report.targetId,
            before: { status: report.status },
            after: { status: "dismissed" },
          },
        },
        tx,
      );

      return {
        reportId: report.id,
        status: "dismissed" as const,
        reviewedAt: reviewedAt.toISOString(),
        auditLogId: auditRow.id,
      };
    });

    return result;
  }
}
