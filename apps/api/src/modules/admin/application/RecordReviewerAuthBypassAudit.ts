import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import type { AuditLogRepository } from "../domain/ports/AuditLogRepository";
import { AUDIT_LOG_REPOSITORY } from "../domain/ports/AuditLogRepository";

export interface ReviewerOtpBypassAuthenticatedEvent {
  userId: string;
  role: "buyer" | "seller";
  occurredAt: string;
}

const REVIEWER_OTP_BYPASS_LOGIN_AUDIT_ACTION = "REVIEWER_OTP_BYPASS_LOGIN";

@Injectable()
export class RecordReviewerAuthBypassAudit {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: AuditLogRepository,
  ) {}

  @OnEvent("ReviewerOtpBypassAuthenticated")
  async handleReviewerOtpBypassAuthenticated(
    event: ReviewerOtpBypassAuthenticatedEvent,
  ): Promise<void> {
    await this.auditRepo.create({
      actorId: null,
      action: REVIEWER_OTP_BYPASS_LOGIN_AUDIT_ACTION,
      targetType: "user",
      targetId: event.userId,
      details: {
        authMethod: "reviewer_otp_bypass",
        role: event.role,
        occurredAt: event.occurredAt,
      },
    });
  }
}
