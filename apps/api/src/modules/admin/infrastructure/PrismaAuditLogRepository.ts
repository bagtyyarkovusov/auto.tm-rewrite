import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { AuditLogRepository, AuditLogRow } from "../domain/ports/AuditLogRepository";

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(params: {
    action?: string;
    targetType?: string;
    targetId?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: AuditLogRow[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (params.action) {
      where["action"] = params.action;
    }
    if (params.targetType) {
      where["targetType"] = params.targetType;
    }
    if (params.targetId) {
      where["targetId"] = params.targetId;
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        actorId: r.actorId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        details: r.details as Record<string, unknown> | null,
        createdAt: r.createdAt,
      })),
      total,
    };
  }
}
