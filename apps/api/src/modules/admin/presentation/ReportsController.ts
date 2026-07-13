import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Inject,
  Res,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { AdminSchemas } from "@auto-tm/contracts";

import { AdminGuard } from "../../../common/admin.guard";
import type { Env } from "../../../env.schema";
import { CreateReport } from "../application/CreateReport";
import { CreateMessageReport } from "../application/CreateMessageReport";
import { ListReports } from "../application/ListReports";
import { GetReportDetail } from "../application/GetReportDetail";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1")
export class ReportsController {
  constructor(
    @Inject(CreateReport)
    private readonly createReportUC: CreateReport,
    @Inject(CreateMessageReport)
    private readonly createMessageReportUC: CreateMessageReport,
    @Inject(ListReports)
    private readonly listReportsUC: ListReports,
    @Inject(GetReportDetail)
    private readonly getReportDetailUC: GetReportDetail,
    @Inject(ConfigService)
    private readonly config: ConfigService<Env, true>,
  ) {}

  private assertReportEntryEnabled(): void {
    const enabled = this.config.get("REPORT_ENTRY_ENABLED", { infer: true });
    if (!enabled) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Feature disabled",
        details: { reason: AdminSchemas.AdminErrorReason.FeatureDisabled },
      });
    }
  }

  // ── Public report creation ──

  @Post("listings/:id/report")
  async reportListing(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    this.assertReportEntryEnabled();
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.CreateReportRequestSchema, body);

    const result = await this.createReportUC.execute({
      reporterUserId: userId,
      targetType: "listing",
      targetId: listingId,
      request: parsed,
    });

    res.status(result.reusedExisting ? HttpStatus.OK : HttpStatus.CREATED);
    return this.toResponse(result.report, result.reusedExisting);
  }

  @Post("users/:id/report")
  async reportUser(
    @Param("id") userId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    this.assertReportEntryEnabled();
    const reporterUserId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.CreateReportRequestSchema, body);

    const result = await this.createReportUC.execute({
      reporterUserId,
      targetType: "user",
      targetId: userId,
      request: parsed,
    });

    res.status(result.reusedExisting ? HttpStatus.OK : HttpStatus.CREATED);
    return this.toResponse(result.report, result.reusedExisting);
  }

  @Post("conversations/:conversationId/messages/:messageId/report")
  async reportMessage(
    @Param("conversationId") conversationId: string,
    @Param("messageId") messageId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    this.assertReportEntryEnabled();
    const reporterUserId = this.userId(req);
    const parsed = this.parseOrThrow(
      AdminSchemas.CreateMessageReportRequestSchema,
      body,
    );

    const result = await this.createMessageReportUC.execute({
      reporterUserId,
      conversationId,
      messageId,
      request: parsed,
    });

    res.status(result.reusedExisting ? HttpStatus.OK : HttpStatus.CREATED);
    return this.toResponse(result.report, result.reusedExisting);
  }

  // ── Admin report reads ──

  @Get("admin/reports")
  @UseGuards(AdminGuard)
  async listReports(
    @Query("status") status: string | undefined,
    @Query("targetType") targetType: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
  ) {
    const result = await this.listReportsUC.execute({
      status,
      targetType,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    });

    return {
      items: result.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  @Get("admin/reports/:id")
  @UseGuards(AdminGuard)
  async getReportDetail(@Param("id") reportId: string) {
    const result = await this.getReportDetailUC.execute({ reportId });

    return {
      id: result.id,
      status: result.status,
      reason: result.reason,
      details: result.details ?? undefined,
      createdAt: result.createdAt.toISOString(),
      reviewedAt: result.reviewedAt?.toISOString(),
      reporter: result.reporter,
      reviewer: result.reviewer,
      target: {
        ...result.target,
        messageCreatedAt: result.target.messageCreatedAt?.toISOString(),
        messageDeletedAt: result.target.messageDeletedAt?.toISOString() ?? null,
      },
      targetModerationState: result.targetModerationState
        ? {
            ...result.targetModerationState,
            suspendedAt: result.targetModerationState.suspendedAt?.toISOString() ?? null,
          }
        : undefined,
      messageContext: result.messageContext
        ? {
            ...result.messageContext,
            messageCreatedAt: result.messageContext.messageCreatedAt.toISOString(),
            messageDeletedAt: result.messageContext.messageDeletedAt?.toISOString(),
            surroundingMessages: result.messageContext.surroundingMessages.map((m) => ({
              ...m,
              createdAt: m.createdAt.toISOString(),
              deletedAt: m.deletedAt?.toISOString(),
            })),
          }
        : undefined,
      reportsSubmittedByReporterCount: result.reportsSubmittedByReporterCount,
      pendingReportsOnTargetCount: result.pendingReportsOnTargetCount,
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

  private toResponse(report: { id: string; status: string; createdAt: Date }, reusedExisting: boolean) {
    return {
      reportId: report.id,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      reusedExisting,
    };
  }
}
