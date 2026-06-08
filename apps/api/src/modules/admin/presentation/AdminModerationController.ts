import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  Inject,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AdminSchemas } from "@auto-tm/contracts";

import { AdminGuard } from "../../../common/admin.guard";
import { BanListing } from "../application/BanListing";
import { UnbanListing } from "../application/UnbanListing";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1/admin/listings")
@UseGuards(AdminGuard)
export class AdminModerationController {
  constructor(
    @Inject(BanListing)
    private readonly banListingUC: BanListing,
    @Inject(UnbanListing)
    private readonly unbanListingUC: UnbanListing,
  ) {}

  @Post(":id/ban")
  async banListing(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
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

  @Post(":id/unban")
  async unbanListing(
    @Param("id") listingId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
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
