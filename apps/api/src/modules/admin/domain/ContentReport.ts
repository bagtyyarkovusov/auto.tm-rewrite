import { DomainError, CONTENT_REPORT_ERROR_CODES } from "./types";

export type ReportTargetType = "listing" | "user" | "message";

export type ReportReason =
  | "spam"
  | "scam"
  | "misleading"
  | "wrong_category"
  | "harassment"
  | "other";

export type ContentReportStatus = "pending" | "actioned" | "dismissed";

export interface SurroundingMessage {
  id: string;
  senderId: string;
  createdAt: Date;
  body: string | null;
  deletedAt: Date | null;
}

export interface MessageReportContext {
  messageId: string;
  conversationId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  senderId: string;
  createdAt: Date;
  body: string | null;
  deletedAt: Date | null;
  surroundingMessages: SurroundingMessage[];
}

export interface ContentReportProps {
  id: string;
  reporterUserId: string | null;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ContentReportStatus;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  messageContext: MessageReportContext | null;
}

export class ContentReport {
  readonly id: string;
  readonly reporterUserId: string | null;
  readonly targetType: ReportTargetType;
  readonly targetId: string;
  readonly reason: ReportReason;
  readonly details: string | null;
  readonly status: ContentReportStatus;
  readonly reviewedById: string | null;
  readonly reviewedAt: Date | null;
  readonly createdAt: Date;
  readonly messageContext: MessageReportContext | null;

  private constructor(props: ContentReportProps) {
    this.id = props.id;
    this.reporterUserId = props.reporterUserId;
    this.targetType = props.targetType;
    this.targetId = props.targetId;
    this.reason = props.reason;
    this.details = props.details;
    this.status = props.status;
    this.reviewedById = props.reviewedById;
    this.reviewedAt = props.reviewedAt;
    this.createdAt = props.createdAt;
    this.messageContext = props.messageContext;
  }

  static create(props: {
    id: string;
    reporterUserId: string | null;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string | null;
    createdAt?: Date;
    messageContext?: MessageReportContext | null;
  }): ContentReport {
    if (props.reporterUserId === null) {
      throw new DomainError(
        CONTENT_REPORT_ERROR_CODES.SELF_REPORT_NOT_ALLOWED,
        "Reporter user id is required at creation time",
      );
    }

    return ContentReport.reconstruct({
      id: props.id,
      reporterUserId: props.reporterUserId,
      targetType: props.targetType,
      targetId: props.targetId,
      reason: props.reason,
      details: props.details ?? null,
      status: "pending",
      reviewedById: null,
      reviewedAt: null,
      createdAt: props.createdAt ?? new Date(),
      messageContext: props.messageContext ?? null,
    });
  }

  static reconstruct(props: ContentReportProps): ContentReport {
    // Reason / target compatibility
    if (props.reason === "wrong_category" && props.targetType !== "listing") {
      throw new DomainError(
        CONTENT_REPORT_ERROR_CODES.INVALID_REASON_FOR_TARGET,
        "wrong_category is only valid for listing reports",
      );
    }
    if (
      props.reason === "harassment" &&
      props.targetType !== "user" &&
      props.targetType !== "message"
    ) {
      throw new DomainError(
        CONTENT_REPORT_ERROR_CODES.INVALID_REASON_FOR_TARGET,
        "harassment is only valid for user or message reports",
      );
    }

    // other requires non-empty trimmed details
    const trimmedDetails =
      typeof props.details === "string" ? props.details.trim() : null;
    if (props.reason === "other") {
      if (!trimmedDetails || trimmedDetails.length === 0) {
        throw new DomainError(
          CONTENT_REPORT_ERROR_CODES.OTHER_REASON_REQUIRES_DETAILS,
          "Details are required when reason is other",
        );
      }
    }

    if (trimmedDetails && trimmedDetails.length > 1000) {
      throw new DomainError(
        CONTENT_REPORT_ERROR_CODES.DETAILS_TOO_LONG,
        "Details must be at most 1000 characters",
      );
    }

    return new ContentReport({
      id: props.id,
      reporterUserId: props.reporterUserId,
      targetType: props.targetType,
      targetId: props.targetId,
      reason: props.reason,
      details: trimmedDetails ?? null,
      status: props.status,
      reviewedById: props.reviewedById,
      reviewedAt: props.reviewedAt,
      createdAt: props.createdAt,
      messageContext: props.messageContext ?? null,
    });
  }
}
