import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import { AdminSchemas } from "@auto-tm/contracts";

import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import type { IdentityAdminPort } from "../../identity/domain/ports/IdentityAdminPort";
import { IDENTITY_ADMIN_PORT } from "../../identity/domain/ports/IdentityAdminPort";
import type { AuditLogRepository } from "../domain/ports/AuditLogRepository";
import { AUDIT_LOG_REPOSITORY } from "../domain/ports/AuditLogRepository";

export interface UnsuspendUserInput {
  userId: string;
  adminUserId: string;
  reason: string;
}

export interface UnsuspendUserResult {
  targetId: string;
  targetState: {
    suspendedAt: null;
    suspendedById: null;
    suspensionReason: null;
  };
  auditLogId: string;
}

@Injectable()
export class UnsuspendUser {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
    @Inject(IDENTITY_ADMIN_PORT)
    private readonly identityAdmin: IdentityAdminPort,
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: AuditLogRepository,
  ) {}

  async execute(input: UnsuspendUserInput): Promise<UnsuspendUserResult> {
    // 1. Resolve user
    const user = await this.identityRead.findUserById(input.userId);

    if (!user) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // 2. Policy checks (before any mutation/audit)
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

    // 3. State check: must be currently suspended
    if (user.suspendedAt == null) {
      throw new ConflictException({
        code: "CONFLICT",
        message: "User is not suspended",
        details: {
          reason: AdminSchemas.AdminErrorReason.ModerationTargetStateConflict,
          targetState: {
            suspendedAt: null,
          },
        },
      });
    }

    // 4. Execute mutation + audit in one transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const unsuspendResult = await this.identityAdmin.unsuspendUser(
        input.userId,
        tx,
      );

      const auditRow = await this.auditRepo.create(
        {
          actorId: input.adminUserId,
          action: AdminSchemas.AdminAuditAction.UserUnsuspend,
          targetType: "user",
          targetId: input.userId,
          details: {
            reason: input.reason,
            before: {
              suspendedAt: user.suspendedAt,
              suspendedById: user.suspendedById,
              suspensionReason: user.suspensionReason,
            },
            after: {
              suspendedAt: unsuspendResult.suspendedAt,
              suspendedById: unsuspendResult.suspendedById,
              suspensionReason: unsuspendResult.suspensionReason,
            },
          },
        },
        tx,
      );

      return {
        targetId: input.userId,
        targetState: {
          suspendedAt: unsuspendResult.suspendedAt,
          suspendedById: unsuspendResult.suspendedById,
          suspensionReason: unsuspendResult.suspensionReason,
        },
        auditLogId: auditRow.id,
      };
    });

    return result;
  }
}
