import type { AuditLogRepository, AuditLogRow } from "../../domain/ports/AuditLogRepository";

export class FakeAuditLogRepository implements AuditLogRepository {
  rows: AuditLogRow[] = [];
  fail = false;

  async findMany() {
    return { items: this.rows, total: this.rows.length };
  }

  async create(data: Parameters<AuditLogRepository["create"]>[0]): Promise<AuditLogRow> {
    if (this.fail) throw new Error("Audit unavailable");
    const row = { ...data, id: `audit-${this.rows.length}`, details: data.details ?? null, createdAt: new Date() };
    this.rows.push(row);
    return row;
  }
}
