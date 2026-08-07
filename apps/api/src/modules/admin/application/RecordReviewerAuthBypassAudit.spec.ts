import { describe, expect, it } from "vitest";

import type { AuditLogRepository, AuditLogRow } from "../domain/ports/AuditLogRepository";
import { RecordReviewerAuthBypassAudit } from "./RecordReviewerAuthBypassAudit";

class FakeAuditLogRepository implements AuditLogRepository {
  rows: AuditLogRow[] = [];

  async findMany(): Promise<{ items: AuditLogRow[]; total: number }> {
    return { items: this.rows, total: this.rows.length };
  }

  async create(data: {
    actorId: string | null;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown> | null;
  }): Promise<AuditLogRow> {
    const row: AuditLogRow = {
      id: `audit-${this.rows.length + 1}`,
      actorId: data.actorId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      details: data.details ?? null,
      createdAt: new Date("2026-07-22T10:00:00Z"),
    };
    this.rows.push(row);
    return row;
  }
}

describe("RecordReviewerAuthBypassAudit", () => {
  it("writes a durable audit row for reviewer bypass auth without persisting the OTP code", async () => {
    const repo = new FakeAuditLogRepository();
    const handler = new RecordReviewerAuthBypassAudit(repo);
    const fixedCodeFixture = String(1).repeat(6);

    await handler.handleReviewerOtpBypassAuthenticated({
      userId: "user-1",
      role: "seller",
      occurredAt: "2026-07-22T09:59:00.000Z",
    });

    expect(repo.rows).toEqual([
      expect.objectContaining({
        actorId: null,
        action: "REVIEWER_OTP_BYPASS_LOGIN",
        targetType: "user",
        targetId: "user-1",
        details: {
          authMethod: "reviewer_otp_bypass",
          role: "seller",
          occurredAt: "2026-07-22T09:59:00.000Z",
        },
      }),
    ]);
    expect(JSON.stringify(repo.rows)).not.toContain(fixedCodeFixture);
  });
});
