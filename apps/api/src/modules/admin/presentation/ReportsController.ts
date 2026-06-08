import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
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
  @HttpCode(HttpStatus.CREATED)
  async reportListing(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.CreateReportRequestSchema, body);

    const result = await this.createReportUC.execute({
      reporterUserId: userId,
      targetType: "listing",
      targetId: listingId,
      request: parsed,
    });

    if (result.reusedExisting) {
      return this.toResponse(result.report, true);
    }

    return this.toResponse(result.report, false);
  }

  @Post("users/:id/report")
  @HttpCode(HttpStatus.CREATED)
  async reportUser(
    @Param("id") userId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const reporterUserId = this.userId(req);
    const parsed = this.parseOrThrow(AdminSchemas.CreateReportRequestSchema, body);

    const result = await this.createReportUC.execute({
      reporterUserId,
      targetType: "user",
      targetId: userId,
      request: parsed,
    });

    if (result.reusedExisting) {
      return this.toResponse(result.report, true);
    }

    return this.toResponse(result.report, false);
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
