import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import { AdminSchemas } from "@auto-tm/contracts";

import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import type { IdentityAdminPort } from "../../identity/domain/ports/IdentityAdminPort";
import { IDENTITY_ADMIN_PORT } from "../../identity/domain/ports/IdentityAdminPort";
import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import { CONTENT_REPORT_REPOSITORY } from "../domain/ports/ContentReportRepository";
import type { AuditLogRepository } from "../domain/ports/AuditLogRepository";
import { AUDIT_LOG_REPOSITORY } from "../domain/ports/AuditLogRepository";

export interface SuspendUserInput {
  userId: string;
  adminUserId: string;
  reason: string;
  reportId?: string | undefined;
}

export interface SuspendUserResult {
  targetId: string;
  targetState: {
    suspendedAt: Date;
    suspendedById: string;
    suspensionReason: string;
  };
  reportId?: string | undefined;
  reportStatus?: "actioned" | undefined;
  auditLogId: string;
}

@Injectable()
export class SuspendUser {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
    @Inject(IDENTITY_ADMIN_PORT)
    private readonly identityAdmin: IdentityAdminPort,
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reportRepo: ContentReportRepository,
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: AuditLogRepository,
  ) {}

  async execute(input: SuspendUserInput): Promise<SuspendUserResult> {
    // 1. Resolve user (required for both direct and report-backed)
    const user = await this.identityRead.findUserById(input.userId);

    if (!user) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // 2. Admin/self policy (checked before mutation/report/audit)
    if (user.role === "admin") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Admin targets cannot be moderated",
        details: {
          reason: AdminSchemas.AdminErrorReason.AdminTargetNotModeratable,
        },
      });
    }

    if (user.id === input.adminUserId) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Self-moderation is not allowed",
        details: {
          reason: AdminSchemas.AdminErrorReason.SelfModerationNotAllowed,
        },
      });
    }

    // 3. Report-backed validation (if reportId provided)
    let report: Awaited<ReturnType<ContentReportRepository["findById"]>> = null;
    if (input.reportId) {
      report = await this.reportRepo.findById(input.reportId);

      if (!report) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      if (report.targetType !== "user" || report.targetId !== input.userId) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: "Report does not match the target user",
          details: {
            reason: AdminSchemas.AdminErrorReason.ReportTargetMismatch,
          },
        });
      }

      if (report.status !== "pending") {
        throw new ConflictException({
          code: "CONFLICT",
          message: "Report has already been resolved",
          details: {
            reason: AdminSchemas.AdminErrorReason.ReportAlreadyResolved,
            reportStatus: report.status,
          },
        });
      }

      // Revalidate target actionability at report-action time
      if (user.suspendedAt != null) {
        throw new ConflictException({
          code: "CONFLICT",
          message: "Report target is no longer actionable",
          details: {
            reason: AdminSchemas.AdminErrorReason.ReportTargetNotActionable,
            targetState: { suspendedAt: user.suspendedAt },
          },
        });
      }
    } else {
      // Direct suspend: revalidate current target state
      if (user.suspendedAt != null) {
        throw new ConflictException({
          code: "CONFLICT",
          message: "User is already suspended",
          details: {
            reason: AdminSchemas.AdminErrorReason.ModerationTargetStateConflict,
            targetState: { suspendedAt: user.suspendedAt },
          },
        });
      }
    }

    // 4. Execute mutation + audit in one transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const suspendResult = await this.identityAdmin.suspendUser(
        input.userId,
        input.adminUserId,
        input.reason,
        tx,
      );

      // Action the report if provided
      let reportStatus: "actioned" | undefined;
      if (report) {
        await this.reportRepo.updateStatus(
          report.id,
          {
            status: "actioned",
            reviewedById: input.adminUserId,
            reviewedAt: new Date(),
          },
          tx,
        );
        reportStatus = "actioned";
      }

      // Write audit log
      const auditDetails: Record<string, unknown> = {
        reason: input.reason,
        before: {
          suspendedAt: user.suspendedAt,
          suspendedById: user.suspendedById,
          suspensionReason: user.suspensionReason,
        },
        after: {
          suspendedAt: suspendResult.suspendedAt,
          suspendedById: suspendResult.suspendedById,
          suspensionReason: suspendResult.suspensionReason,
        },
      };
      if (report) {
        auditDetails["reportId"] = report.id;
        (auditDetails["before"] as Record<string, unknown>)["reportStatus"] = "pending";
        (auditDetails["after"] as Record<string, unknown>)["reportStatus"] = "actioned";
      }

      const auditRow = await this.auditRepo.create(
        {
          actorId: input.adminUserId,
          action: AdminSchemas.AdminAuditAction.UserSuspend,
          targetType: "user",
          targetId: input.userId,
          details: auditDetails,
        },
        tx,
      );

      return {
        targetId: input.userId,
        targetState: {
          suspendedAt: suspendResult.suspendedAt,
          suspendedById: suspendResult.suspendedById,
          suspensionReason: suspendResult.suspensionReason,
        },
        reportId: report ? report.id : undefined,
        reportStatus,
        auditLogId: auditRow.id,
      };
    });

    return result;
  }
}
