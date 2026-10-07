import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import {
  IDENTITY_READ_PORT,
  PROFILE_PHOTO_PORT,
  type IdentityReadPort,
  type ProfilePhotoPort,
} from "../../identity/identity.public";
import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import { CONTENT_REPORT_REPOSITORY } from "../domain/ports/ContentReportRepository";
import type { AuditLogRepository } from "../domain/ports/AuditLogRepository";
import { AUDIT_LOG_REPOSITORY } from "../domain/ports/AuditLogRepository";

export interface RemoveUserPhotoInput {
  userId: string;
  adminUserId: string;
  reason: string;
  reportId?: string | undefined;
}

export interface RemoveUserPhotoResult {
  targetId: string;
  targetState: { avatarKey: null; avatarIndex: number };
  reportId?: string | undefined;
  reportStatus?: "actioned" | undefined;
  auditLogId: string;
}

@Injectable()
export class RemoveUserPhoto {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
    @Inject(PROFILE_PHOTO_PORT)
    private readonly photos: ProfilePhotoPort,
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reportRepo: ContentReportRepository,
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: AuditLogRepository,
  ) {}

  async execute(input: RemoveUserPhotoInput): Promise<RemoveUserPhotoResult> {
    // Skeleton for the failing-test checkpoint (#642); no behaviour yet.
    return {
      targetId: input.userId,
      targetState: { avatarKey: null, avatarIndex: 0 },
      auditLogId: "",
    };
  }
}
