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

  async findById(id: string): Promise<ContentReport | null> {
    const row = await this.prisma.contentReport.findUnique({
      where: { id },
    });

    return row ? this.toDomain(row) : null;
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

  async findMany(params: {
    status?: string;
    targetType?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: ContentReport[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (params.status) {
      where["status"] = params.status;
    }
    if (params.targetType) {
      where["targetType"] = params.targetType;
    }

    const [rows, total] = await Promise.all([
      this.prisma.contentReport.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.contentReport.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toDomain(r)),
      total,
    };
  }

  async countPendingByTarget(
    targetType: string,
    targetId: string,
  ): Promise<number> {
    return this.prisma.contentReport.count({
      where: {
        targetType,
        targetId,
        status: "pending",
      },
    });
  }

  async countByReporter(reporterUserId: string): Promise<number> {
    return this.prisma.contentReport.count({
      where: {
        reporterUserId,
      },
    });
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["contentReport"]["create"]>>,
  ): ContentReport {
    return ContentReport.reconstruct({
      id: row.id,
      reporterUserId: row.reporterUserId,
      targetType: row.targetType as "listing" | "user",
      targetId: row.targetId,
      reason: row.reason as ContentReport["reason"],
      details: row.details,
      status: row.status as ContentReport["status"],
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
    });
  }
}
