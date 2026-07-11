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
import { ReportsSchemas } from "@auto-tm/contracts";

import { AdminGuard } from "../../../common/admin.guard";
import type { Env } from "../../../env.schema";
import { CreateInspectionInterest } from "../application/CreateInspectionInterest";
import { ListInspectionInterestStats } from "../application/ListInspectionInterestStats";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1")
export class ReportsController {
  constructor(
    @Inject(CreateInspectionInterest)
    private readonly createInterestUC: CreateInspectionInterest,
    @Inject(ListInspectionInterestStats)
    private readonly listStatsUC: ListInspectionInterestStats,
    @Inject(ConfigService)
    private readonly config: ConfigService<Env, true>,
  ) {}

  private assertInspectionInterestEnabled(): void {
    const enabled = this.config.get("INSPECTION_INTEREST_ENABLED", {
      infer: true,
    });
    if (!enabled) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Feature disabled",
        details: { reason: "FEATURE_DISABLED" },
      });
    }
  }

  @Post("listings/:id/inspection-interest")
  async createInspectionInterest(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    this.assertInspectionInterestEnabled();
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      ReportsSchemas.CreateInspectionInterestRequestSchema,
      body,
    );

    const result = await this.createInterestUC.execute({
      listingId,
      requesterUserId: userId,
      request: parsed,
    });

    res.status(result.reusedExisting ? HttpStatus.OK : HttpStatus.CREATED);
    return {
      id: result.interest.id,
      listingId: result.interest.listingId,
      requesterUserId: result.interest.requesterUserId,
      side: result.interest.side,
      willingnessToPayTmt: result.interest.willingnessToPayTmt,
      createdAt: result.interest.createdAt.toISOString(),
      updatedAt: result.interest.updatedAt.toISOString(),
      reusedExisting: result.reusedExisting,
    };
  }

  @Get("admin/inspection-interests")
  @UseGuards(AdminGuard)
  async listInspectionInterestStats(
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
  ) {
    const input: { page?: number; pageSize?: number } = {};
    if (page !== undefined) {
      input.page = Number(page);
    }
    if (pageSize !== undefined) {
      input.pageSize = Number(pageSize);
    }

    const result = await this.listStatsUC.execute(input);

    return {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
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
