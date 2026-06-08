export interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AuditLogRepository {
  findMany(params: {
    action?: string | undefined;
    targetType?: string | undefined;
    targetId?: string | undefined;
    page: number;
    pageSize: number;
  }): Promise<{ items: AuditLogRow[]; total: number }>;
}

export const AUDIT_LOG_REPOSITORY = Symbol("AuditLogRepository");
