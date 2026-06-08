import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ConflictException } from "@nestjs/common";

import { DismissReport } from "./DismissReport";
import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import { ContentReport } from "../domain/ContentReport";
import type { AuditLogRepository, AuditLogRow } from "../domain/ports/AuditLogRepository";
import { AdminSchemas } from "@auto-tm/contracts";

class FakeContentReportRepository implements ContentReportRepository {
  reports: ContentReport[] = [];

  async save(report: ContentReport): Promise<ContentReport> {
    this.reports.push(report);
    return report;
  }

  async findById(id: string): Promise<ContentReport | null> {
    return this.reports.find((r) => r.id === id) ?? null;
  }

  async findPendingByReporterAndTarget(): Promise<ContentReport | null> {
    return null;
  }

  async findMany(): Promise<{ items: ContentReport[]; total: number }> {
    return { items: [], total: 0 };
  }

  async countPendingByTarget(): Promise<number> {
    return 0;
  }

  async countByReporter(): Promise<number> {
    return 0;
  }

  async updateStatus(
    id: string,
    data: { status: string; reviewedById: string; reviewedAt: Date },
  ): Promise<ContentReport> {
    const report = this.reports.find((r) => r.id === id);
    if (!report) throw new Error("Report not found");
    const updated = ContentReport.reconstruct({
      ...report,
      status: data.status as ContentReport["status"],
      reviewedById: data.reviewedById,
      reviewedAt: data.reviewedAt,
    });
    const idx = this.reports.findIndex((r) => r.id === id);
    this.reports[idx] = updated;
    return updated;
  }
}

class FakeAuditLogRepository implements AuditLogRepository {
  rows: AuditLogRow[] = [];

  async findMany(): Promise<{ items: AuditLogRow[]; total: number }> {
    return { items: [], total: 0 };
  }

  async create(
    data: {
      actorId: string | null;
      action: string;
      targetType: string;
      targetId: string;
      details?: Record<string, unknown> | null;
    },
  ): Promise<AuditLogRow> {
    const row: AuditLogRow = {
      id: `audit-${this.rows.length + 1}`,
      actorId: data.actorId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      details: data.details ?? null,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }
}

class FakePrismaService {
  async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return fn(undefined);
  }
}

function makeReport(
  id: string,
  targetType: "listing" | "user",
  targetId: string,
  status = "pending",
) {
  return ContentReport.reconstruct({
    id,
    reporterUserId: "reporter-1",
    targetType,
    targetId,
    reason: "spam",
    details: null,
    status: status as ContentReport["status"],
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });
}

function makeUseCase(
  prisma?: FakePrismaService,
  reportRepo?: FakeContentReportRepository,
  auditRepo?: FakeAuditLogRepository,
) {
  return new DismissReport(
    (prisma ?? new FakePrismaService()) as unknown as ConstructorParameters<typeof DismissReport>[0],
    reportRepo ?? new FakeContentReportRepository(),
    auditRepo ?? new FakeAuditLogRepository(),
  );
}

describe("DismissReport", () => {
  let prisma: FakePrismaService;
  let reportRepo: FakeContentReportRepository;
  let auditRepo: FakeAuditLogRepository;

  beforeEach(() => {
    prisma = new FakePrismaService();
    reportRepo = new FakeContentReportRepository();
    auditRepo = new FakeAuditLogRepository();
  });

  it("dismisses a pending report and writes audit", async () => {
    reportRepo.reports = [makeReport("r1", "listing", "l1")];

    const uc = makeUseCase(prisma, reportRepo, auditRepo);
    const result = await uc.execute({
      reportId: "r1",
      adminUserId: "admin-1",
      reason: "Not a violation",
    });

    expect(result.reportId).toBe("r1");
    expect(result.status).toBe("dismissed");
    expect(result.auditLogId).toBeDefined();

    const updatedReport = reportRepo.reports.find((r) => r.id === "r1");
    expect(updatedReport?.status).toBe("dismissed");
    expect(updatedReport?.reviewedById).toBe("admin-1");

    expect(auditRepo.rows).toHaveLength(1);
    expect(auditRepo.rows[0]!.action).toBe(AdminSchemas.AdminAuditAction.ContentReportResolve);
    expect(auditRepo.rows[0]!.targetType).toBe("content_report");
    expect(auditRepo.rows[0]!.targetId).toBe("r1");
    expect(auditRepo.rows[0]!.details).toMatchObject({
      reason: "Not a violation",
      reportedTargetType: "listing",
      reportedTargetId: "l1",
      before: { status: "pending" },
      after: { status: "dismissed" },
    });
  });

  it("returns NOT_FOUND for missing report", async () => {
    const uc = makeUseCase(prisma, reportRepo, auditRepo);
    await expect(
      uc.execute({ reportId: "missing", adminUserId: "admin-1", reason: "Spam" }),
    ).rejects.toThrow(NotFoundException);
    expect(auditRepo.rows).toHaveLength(0);
  });

  it("returns REPORT_ALREADY_RESOLVED for non-pending report", async () => {
    reportRepo.reports = [makeReport("r1", "listing", "l1", "dismissed")];

    const uc = makeUseCase(prisma, reportRepo, auditRepo);
    try {
      await uc.execute({ reportId: "r1", adminUserId: "admin-1", reason: "Spam" });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as ConflictException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response["code"]).toBe("CONFLICT");
      expect(response["details"]).toMatchObject({
        reason: AdminSchemas.AdminErrorReason.ReportAlreadyResolved,
      });
    }
    expect(auditRepo.rows).toHaveLength(0);
  });

  it("rolls back when audit write fails", async () => {
    reportRepo.reports = [makeReport("r1", "listing", "l1")];

    const failingPrisma = {
      async $transaction<T>(_fn: (tx: unknown) => Promise<T>): Promise<T> {
        throw new Error("Transaction rollback");
      },
    };

    const uc = makeUseCase(
      failingPrisma as unknown as FakePrismaService,
      reportRepo,
      auditRepo,
    );
    await expect(
      uc.execute({ reportId: "r1", adminUserId: "admin-1", reason: "Spam" }),
    ).rejects.toThrow("Transaction rollback");

    // Report should remain unchanged because the transaction rolled back
    expect(reportRepo.reports[0]!.status).toBe("pending");
    expect(auditRepo.rows).toHaveLength(0);
  });
});
