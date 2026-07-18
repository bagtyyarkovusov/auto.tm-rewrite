import { Inject, Injectable } from "@nestjs/common";
import { PrismaService, Prisma } from "@auto-tm/db";

import { ContentReport } from "../domain/ContentReport";
import type { MessageReportContext } from "../domain/ContentReport";
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
        messageContext:
          report.messageContext === null
            ? Prisma.JsonNull
            : (report.messageContext as unknown as Prisma.InputJsonValue),
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

  async updateStatus(
    id: string,
    data: {
      status: string;
      reviewedById: string;
      reviewedAt: Date;
    },
    tx?: unknown,
  ): Promise<ContentReport> {
    const client = (tx as PrismaService | undefined) ?? this.prisma;
    const row = await client.contentReport.update({
      where: { id },
      data: {
        status: data.status,
        reviewedById: data.reviewedById,
        reviewedAt: data.reviewedAt,
      },
    });

    return this.toDomain(row);
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["contentReport"]["create"]>>,
  ): ContentReport {
    return ContentReport.reconstruct({
      id: row.id,
      reporterUserId: row.reporterUserId,
      targetType: row.targetType as "listing" | "user" | "message",
      targetId: row.targetId,
      reason: row.reason as ContentReport["reason"],
      details: row.details,
      status: row.status as ContentReport["status"],
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      messageContext: rehydrateMessageContext(row.messageContext),
    });
  }
}

export function rehydrateMessageContext(value: unknown): MessageReportContext | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const context = value as Omit<
    MessageReportContext,
    "createdAt" | "deletedAt" | "surroundingMessages"
  > & {
    createdAt: string | Date;
    deletedAt: string | Date | null;
    surroundingMessages: Array<
      Omit<MessageReportContext["surroundingMessages"][number], "createdAt" | "deletedAt"> & {
        createdAt: string | Date;
        deletedAt: string | Date | null;
      }
    >;
  };

  return {
    ...context,
    createdAt: new Date(context.createdAt),
    deletedAt: context.deletedAt === null ? null : new Date(context.deletedAt),
    surroundingMessages: context.surroundingMessages.map((message) => ({
      ...message,
      createdAt: new Date(message.createdAt),
      deletedAt:
        message.deletedAt === null ? null : new Date(message.deletedAt),
    })),
  };
}
