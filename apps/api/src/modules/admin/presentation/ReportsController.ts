import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  BadRequestException,
  HttpStatus,
  Inject,
  Res,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { AdminSchemas } from "@auto-tm/contracts";

import { CreateReport } from "../application/CreateReport";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1")
export class ReportsController {
  constructor(
    @Inject(CreateReport)
    private readonly createReportUC: CreateReport,
  ) {}

  @Post("listings/:id/report")
  async reportListing(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
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
