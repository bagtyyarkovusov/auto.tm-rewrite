import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomUUID } from "node:crypto";

import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import { AdminSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { ContentReport } from "../domain/ContentReport";
import { DomainError } from "../domain/types";
import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import { CONTENT_REPORT_REPOSITORY } from "../domain/ports/ContentReportRepository";

type CreateReportRequest = z.infer<typeof AdminSchemas.CreateReportRequestSchema>;

export interface CreateReportInput {
  reporterUserId: string;
  targetType: "listing" | "user";
  targetId: string;
  request: CreateReportRequest;
}

export interface CreateReportResult {
  report: ContentReport;
  reusedExisting: boolean;
}

@Injectable()
export class CreateReport {
  constructor(
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reportRepo: ContentReportRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listingsRead: ListingsReadPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
    @Inject(EventEmitter2)
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: CreateReportInput): Promise<CreateReportResult> {
    // 1. Validate reporter is not suspended
    const reporter = await this.identityRead.findUserById(input.reporterUserId);
    if (reporter?.suspendedAt) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }

    // 2. Validate target
    if (input.targetType === "listing") {
      return this.createListingReport(input);
    }

    return this.createUserReport(input);
  }

  private async createListingReport(
    input: CreateReportInput,
  ): Promise<CreateReportResult> {
    const listing = await this.listingsRead.getListingSummary(input.targetId);

    if (!listing) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Listing not found",
      });
    }

    if (listing.status === "sold") {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "This listing is no longer available to report",
        details: {
          reason: AdminSchemas.AdminErrorReason.ReportTargetNotReportable,
        },
      });
    }

    if (listing.status !== "active") {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Listing not found",
      });
    }

    if (listing.sellerId === input.reporterUserId) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "You cannot report your own listing",
        details: {
          reason: AdminSchemas.AdminErrorReason.SelfReportNotAllowed,
        },
      });
    }

    return this.upsertReport(input);
  }

  private async createUserReport(
    input: CreateReportInput,
  ): Promise<CreateReportResult> {
    const user = await this.identityRead.findUserById(input.targetId);

    if (!user) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (user.id === input.reporterUserId) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "You cannot report yourself",
        details: {
          reason: AdminSchemas.AdminErrorReason.SelfReportNotAllowed,
        },
      });
    }

    return this.upsertReport(input);
  }

  private async upsertReport(
    input: CreateReportInput,
  ): Promise<CreateReportResult> {
    const existing = await this.reportRepo.findPendingByReporterAndTarget(
      input.reporterUserId,
      input.targetType,
      input.targetId,
    );

    if (existing) {
      return { report: existing, reusedExisting: true };
    }

    let report: ContentReport;
    try {
      report = ContentReport.create({
        id: randomUUID(),
        reporterUserId: input.reporterUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.request.reason,
        details: input.request.details ?? null,
        messageContext: null,
      });
    } catch (err) {
      if (err instanceof DomainError) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: err.message,
          details: { reason: err.code },
        });
      }
      throw err;
    }

    const saved = await this.reportRepo.save(report);

    this.eventEmitter.emit("ContentReportCreated", {
      reportId: saved.id,
      targetType: saved.targetType,
      targetId: saved.targetId,
      reporterUserId: saved.reporterUserId,
      reason: saved.reason,
    });

    return { report: saved, reusedExisting: false };
  }
}
