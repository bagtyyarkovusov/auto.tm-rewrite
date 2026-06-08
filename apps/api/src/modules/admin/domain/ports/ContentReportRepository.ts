import type { ContentReport } from "../ContentReport";

export interface ContentReportRepository {
  save(report: ContentReport): Promise<ContentReport>;
  findById(id: string): Promise<ContentReport | null>;
  findPendingByReporterAndTarget(
    reporterUserId: string,
    targetType: string,
    targetId: string,
  ): Promise<ContentReport | null>;
  findMany(params: {
    status?: string | undefined;
    targetType?: string | undefined;
    page: number;
    pageSize: number;
  }): Promise<{ items: ContentReport[]; total: number }>;
  countPendingByTarget(targetType: string, targetId: string): Promise<number>;
  countByReporter(reporterUserId: string): Promise<number>;
}

export const CONTENT_REPORT_REPOSITORY = Symbol("ContentReportRepository");
