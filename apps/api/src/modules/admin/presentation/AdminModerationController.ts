import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  Inject,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AdminSchemas } from "@auto-tm/contracts";

import { AdminGuard } from "../../../common/admin.guard";
import type { Env } from "../../../env.schema";
import { BanListing } from "../application/BanListing";
import { UnbanListing } from "../application/UnbanListing";
import { SuspendUser } from "../application/SuspendUser";
import { UnsuspendUser } from "../application/UnsuspendUser";
import { DismissReport } from "../application/DismissReport";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1/admin")
@UseGuards(AdminGuard)
export class AdminModerationController {
  constructor(
    @Inject(BanListing)
    private readonly banListingUC: BanListing,
    @Inject(UnbanListing)
    private readonly unbanListingUC: UnbanListing,
    @Inject(SuspendUser)
    private readonly suspendUserUC: SuspendUser,
    @Inject(UnsuspendUser)
    private readonly unsuspendUserUC: UnsuspendUser,
    @Inject(DismissReport)
    private readonly dismissReportUC: DismissReport,
    @Inject(ConfigService)
    private readonly config: ConfigService<Env, true>,
  ) {}

  private assertModerationActionsEnabled(): void {
    const enabled = this.config.get("ADMIN_MODERATION_ACTIONS_ENABLED", { infer: true });
    if (!enabled) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Feature disabled",
        details: { reason: AdminSchemas.AdminErrorReason.FeatureDisabled },
      });
    }
  }

  @Post("reports/:id/dismiss")
  async dismissReport(
    @Param("id") reportId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    this.assertModerationActionsEnabled();
    const adminUserId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.DismissReportRequestSchema, body);

    const result = await this.dismissReportUC.execute({
      reportId,
      adminUserId,
      reason: parsed.reason,
    });

    return {
      reportId: result.reportId,
      status: result.status,
      reviewedAt: result.reviewedAt,
      auditLogId: result.auditLogId,
    };
  }

  @Post("listings/:id/ban")
  async banListing(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    this.assertModerationActionsEnabled();
    const adminUserId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.BanListingRequestSchema, body);

    const result = await this.banListingUC.execute({
      listingId,
      adminUserId,
      reason: parsed.reason,
      reportId: parsed.reportId,
    });

    return {
      targetId: result.targetId,
      targetState: result.targetState,
      ...(result.reportId !== undefined ? { reportId: result.reportId } : {}),
      ...(result.reportStatus !== undefined ? { reportStatus: result.reportStatus } : {}),
      auditLogId: result.auditLogId,
    };
  }

  @Post("listings/:id/unban")
  async unbanListing(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    this.assertModerationActionsEnabled();
    const adminUserId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.UnbanListingRequestSchema, body);

    const result = await this.unbanListingUC.execute({
      listingId,
      adminUserId,
      reason: parsed.reason,
    });

    return {
      targetId: result.targetId,
      targetState: result.targetState,
      auditLogId: result.auditLogId,
    };
  }

  @Post("users/:id/suspend")
  async suspendUser(
    @Param("id") userId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    this.assertModerationActionsEnabled();
    const adminUserId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.SuspendUserRequestSchema, body);

    const result = await this.suspendUserUC.execute({
      userId,
      adminUserId,
      reason: parsed.reason,
      reportId: parsed.reportId,
    });

    return {
      targetId: result.targetId,
      targetState: {
        suspendedAt: result.targetState.suspendedAt?.toISOString() ?? null,
        suspendedById: result.targetState.suspendedById,
        suspensionReason: result.targetState.suspensionReason,
      },
      ...(result.reportId !== undefined ? { reportId: result.reportId } : {}),
      ...(result.reportStatus !== undefined ? { reportStatus: result.reportStatus } : {}),
      auditLogId: result.auditLogId,
    };
  }

  @Post("users/:id/unsuspend")
  async unsuspendUser(
    @Param("id") userId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    this.assertModerationActionsEnabled();
    const adminUserId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.UnsuspendUserRequestSchema, body);

    const result = await this.unsuspendUserUC.execute({
      userId,
      adminUserId,
      reason: parsed.reason,
    });

    return {
      targetId: result.targetId,
      targetState: {
        suspendedAt: result.targetState.suspendedAt,
        suspendedById: result.targetState.suspendedById,
        suspensionReason: result.targetState.suspensionReason,
      },
      auditLogId: result.auditLogId,
    };
  }

  private userId(req: FastifyRequest): string {
    return (req as AuthenticatedRequest).user?.sub as string;
  }

  private parseOrThrow<T>(
    schema: { parse: (data: unknown) => T },
    data: unknown,
  ): T {
    try {
      return schema.parse(data);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: "Invalid request",
          details: err.flatten(),
        });
      }
      throw err;
    }
  }
}
