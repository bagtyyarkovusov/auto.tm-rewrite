import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import { CONTENT_REPORT_REPOSITORY } from "../domain/ports/ContentReportRepository";
import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";

export interface GetReportDetailInput {
  reportId: string;
}

export interface GetReportDetailResult {
  id: string;
  status: string;
  reason: string;
  details: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reporter: {
    available: boolean;
    label: string;
    userId?: string;
  };
  reviewer?: {
    available: boolean;
    label: string;
    userId?: string | undefined;
  } | undefined;
  target: {
    targetType: string;
    available: boolean;
    label: string;
    targetId: string;
    title?: string | undefined;
    year?: number | undefined;
    make?: string | undefined;
    model?: string | undefined;
    status?: string | undefined;
    role?: string | undefined;
    conversationId?: string | undefined;
    listingId?: string | undefined;
    senderId?: string | undefined;
    messageCreatedAt?: Date | undefined;
    messageBody?: string | undefined;
    messageDeletedAt?: Date | null | undefined;
  };
  targetModerationState?: {
    status?: string | undefined;
    suspendedAt: Date | null;
    suspendedById: string | null;
    suspensionReason: string | null;
  } | undefined;
  messageContext?: {
    conversationId: string;
    messageId: string;
    listingId: string;
    senderId: string;
    messageCreatedAt: Date;
    messageBody: string | undefined;
    messageDeletedAt: Date | null;
    surroundingMessages: Array<{
      id: string;
      senderId: string;
      createdAt: Date;
      body: string | null;
      deletedAt: Date | null;
    }>;
  } | undefined;
  reportsSubmittedByReporterCount?: number | undefined;
  pendingReportsOnTargetCount: number;
}

@Injectable()
export class GetReportDetail {
  constructor(
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reportRepo: ContentReportRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listingsRead: ListingsReadPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
  ) {}

  async execute(input: GetReportDetailInput): Promise<GetReportDetailResult> {
    const report = await this.reportRepo.findById(input.reportId);
    if (!report) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Report not found",
      });
    }

    const [
      reporter,
      reviewer,
      listings,
      users,
      pendingReportsOnTargetCount,
      reportsSubmittedByReporterCount,
    ] = await Promise.all([
      report.reporterUserId
        ? this.identityRead.findUserById(report.reporterUserId)
        : Promise.resolve(null),
      report.reviewedById
        ? this.identityRead.findUserById(report.reviewedById)
        : Promise.resolve(null),
      report.targetType === "listing"
        ? this.listingsRead.getListingAdminSummaries([report.targetId])
        : Promise.resolve([]),
      report.targetType === "user"
        ? this.identityRead.findUsersByIds([report.targetId])
        : Promise.resolve([]),
      this.reportRepo.countPendingByTarget(report.targetType, report.targetId),
      report.reporterUserId
        ? this.reportRepo.countByReporter(report.reporterUserId)
        : Promise.resolve(undefined),
    ]);

    const target =
      report.targetType === "listing"
        ? this.buildListingTarget(listings[0], report.targetId)
        : report.targetType === "user"
          ? this.buildUserTarget(users[0], report.targetId)
          : this.buildMessageTarget(report);

    let targetModerationState: GetReportDetailResult["targetModerationState"];
    if (report.targetType === "listing" && listings[0]) {
      targetModerationState = {
        status: listings[0].status,
        suspendedAt: null,
        suspendedById: null,
        suspensionReason: null,
      };
    } else if (report.targetType === "user" && users[0]) {
      targetModerationState = {
        suspendedAt: users[0].suspendedAt,
        suspendedById: users[0].suspendedById,
        suspensionReason: users[0].suspensionReason,
      };
    } else {
      targetModerationState = undefined;
    }

    const messageContext =
      report.targetType === "message" && report.messageContext
        ? {
            conversationId: report.messageContext.conversationId,
            messageId: report.messageContext.messageId,
            listingId: report.messageContext.listingId,
            senderId: report.messageContext.senderId,
            messageCreatedAt: report.messageContext.createdAt,
            messageBody: report.messageContext.body ?? undefined,
            messageDeletedAt: report.messageContext.deletedAt,
            surroundingMessages: report.messageContext.surroundingMessages,
          }
        : undefined;

    return {
      id: report.id,
      status: report.status,
      reason: report.reason,
      details: report.details,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
      reporter: reporter
        ? { available: true, label: reporter.displayName ?? `User ${reporter.id.slice(0, 8)}`, userId: reporter.id }
        : { available: false, label: "Deleted user" },
      reviewer: report.reviewedById
        ? reviewer
          ? { available: true, label: reviewer.displayName ?? `User ${reviewer.id.slice(0, 8)}`, userId: reviewer.id }
          : { available: false, label: "Deleted user" }
        : undefined,
      target,
      targetModerationState,
      messageContext,
      reportsSubmittedByReporterCount,
      pendingReportsOnTargetCount,
    };
  }

  private buildListingTarget(
    listing: { id: string; sellerId: string; status: string; year: number | null; brandName: string; modelName: string } | undefined,
    targetId: string,
  ): GetReportDetailResult["target"] {
    if (!listing) {
      return {
        targetType: "listing",
        available: false,
        label: "Unavailable target",
        targetId,
      };
    }

    const label = listing.year
      ? `${listing.year} ${listing.brandName} ${listing.modelName}`
      : `${listing.brandName} ${listing.modelName}`;

    return {
      targetType: "listing",
      available: true,
      label,
      targetId: listing.id,
      title: label,
      year: listing.year ?? undefined,
      make: listing.brandName,
      model: listing.modelName,
      status: listing.status,
    };
  }

  private buildUserTarget(
    user: { id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null } | undefined,
    targetId: string,
  ): GetReportDetailResult["target"] {
    if (!user) {
      return {
        targetType: "user",
        available: false,
        label: "Unavailable target",
        targetId,
      };
    }

    return {
      targetType: "user",
      available: true,
      label: user.displayName ?? `User ${user.id.slice(0, 8)}`,
      targetId: user.id,
      role: user.role,
    };
  }

  private buildMessageTarget(report: {
    targetId: string;
    messageContext: { messageId: string; conversationId: string; listingId: string; buyerId: string; sellerId: string; senderId: string; createdAt: Date; body: string | null; deletedAt: Date | null } | null;
  }): GetReportDetailResult["target"] {
    const ctx = report.messageContext;
    if (!ctx) {
      return {
        targetType: "message",
        available: false,
        label: "Unavailable target",
        targetId: report.targetId,
      };
    }

    const label = ctx.deletedAt
      ? `Deleted message in conversation ${ctx.conversationId.slice(0, 8)}`
      : `Message in conversation ${ctx.conversationId.slice(0, 8)}`;

    return {
      targetType: "message",
      available: true,
      label,
      targetId: ctx.messageId,
      conversationId: ctx.conversationId,
      listingId: ctx.listingId,
      senderId: ctx.senderId,
      messageCreatedAt: ctx.createdAt,
      messageBody: ctx.body ?? undefined,
      messageDeletedAt: ctx.deletedAt,
    };
  }
}
