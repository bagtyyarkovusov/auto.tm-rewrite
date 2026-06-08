import type { ContentReport } from "../ContentReport";

export interface ContentReportRepository {
  save(report: ContentReport): Promise<ContentReport>;
  findPendingByReporterAndTarget(
    reporterUserId: string,
    targetType: string,
    targetId: string,
  ): Promise<ContentReport | null>;
}

export const CONTENT_REPORT_REPOSITORY = Symbol("ContentReportRepository");
