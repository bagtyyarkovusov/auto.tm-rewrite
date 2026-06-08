import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { ContentReport } from "../domain/ContentReport";
import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";

@Injectable()
export class PrismaContentReportRepository implements ContentReportRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(report: ContentReport): Promise<ContentReport> {
    const row = await this.prisma.contentReport.create({
      data: {
        id: report.id,
        reporterUserId: report.reporterUserId,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        details: report.details,
        status: report.status,
        reviewedById: report.reviewedById,
        reviewedAt: report.reviewedAt,
        createdAt: report.createdAt,
      },
    });

    return this.toDomain(row);
  }

  async findPendingByReporterAndTarget(
    reporterUserId: string,
    targetType: string,
    targetId: string,
  ): Promise<ContentReport | null> {
    const row = await this.prisma.contentReport.findFirst({
      where: {
        reporterUserId,
        targetType,
        targetId,
        status: "pending",
      },
    });

    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["contentReport"]["create"]>>,
  ): ContentReport {
    return ContentReport.create({
      id: row.id,
      reporterUserId: row.reporterUserId,
      targetType: row.targetType as "listing" | "user",
      targetId: row.targetId,
      reason: row.reason as ContentReport["reason"],
      details: row.details,
      createdAt: row.createdAt,
    });
  }
}
