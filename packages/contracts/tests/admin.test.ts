import { describe, it, expect } from "vitest";

import {
  AdminTotpStatusResponseSchema,
  AdminTotpEnrollResponseSchema,
  AdminTotpVerifyRequestSchema,
  AdminTotpVerifyResponseSchema,
} from "../src/schemas/auth";
import {
  ReportReason,
  ContentReportStatus,
  AdminAuditAction,
  AdminErrorReason,
  CreateReportRequestSchema,
  CreateReportResponseSchema,
  ReportListItemSchema,
  ListReportsResponseSchema,
  GetReportDetailResponseSchema,
  DismissReportRequestSchema,
  DismissReportResponseSchema,
  BanListingRequestSchema,
  BanListingResponseSchema,
  UnbanListingRequestSchema,
  UnbanListingResponseSchema,
  SuspendUserRequestSchema,
  SuspendUserResponseSchema,
  UnsuspendUserRequestSchema,
  UnsuspendUserResponseSchema,
  AuditLogListItemSchema,
  ListAuditEntriesResponseSchema,
} from "../src/schemas/admin";
import { AdminTablePaginationRequestSchema } from "../src/pagination";
import { generateOpenApiDocument } from "../src/openapi";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

// ── Admin TOTP schemas ──

describe("AdminTotpStatusResponseSchema", () => {
  it("accepts valid status without expiration", () => {
    const result = AdminTotpStatusResponseSchema.safeParse({
      enrolled: true,
      elevated: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid status with expiration", () => {
    const result = AdminTotpStatusResponseSchema.safeParse({
      enrolled: true,
      elevated: true,
      adminTotpExpiresAt: "2026-06-08T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects secret leakage", () => {
    const result = AdminTotpStatusResponseSchema.safeParse({
      enrolled: true,
      elevated: true,
      secret: "shhh",
    });
    expect(result.success).toBe(false);
  });

  it("rejects qrCodeUrl leakage", () => {
    const result = AdminTotpStatusResponseSchema.safeParse({
      enrolled: true,
      elevated: true,
      qrCodeUrl: "otpauth://...",
    });
    expect(result.success).toBe(false);
  });

  it("rejects backupCodes leakage", () => {
    const result = AdminTotpStatusResponseSchema.safeParse({
      enrolled: true,
      elevated: true,
      backupCodes: ["abc", "def"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects backupCodeCount leakage", () => {
    const result = AdminTotpStatusResponseSchema.safeParse({
      enrolled: true,
      elevated: true,
      backupCodeCount: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe("AdminTotpEnrollResponseSchema", () => {
  it("accepts valid enroll response", () => {
    const result = AdminTotpEnrollResponseSchema.safeParse({
      qrCodeUrl: "otpauth://totp/auto.tm%20Admin:admin@auto.tm?secret=XXX",
      secret: "JBSWY3DPEHPK3PXP",
    });
    expect(result.success).toBe(true);
  });

  it("rejects backupCodes on enroll", () => {
    const result = AdminTotpEnrollResponseSchema.safeParse({
      qrCodeUrl: "otpauth://...",
      secret: "XXX",
      backupCodes: ["abc", "def"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects adminTotpExpiresAt on enroll", () => {
    const result = AdminTotpEnrollResponseSchema.safeParse({
      qrCodeUrl: "otpauth://...",
      secret: "XXX",
      adminTotpExpiresAt: "2026-06-08T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("AdminTotpVerifyRequestSchema", () => {
  it("accepts a valid code", () => {
    const result = AdminTotpVerifyRequestSchema.safeParse({ code: "123456" });
    expect(result.success).toBe(true);
  });

  it("rejects empty code", () => {
    const result = AdminTotpVerifyRequestSchema.safeParse({ code: "" });
    expect(result.success).toBe(false);
  });
});

describe("AdminTotpVerifyResponseSchema", () => {
  it("accepts first-verify response with exactly 10 backup codes", () => {
    const result = AdminTotpVerifyResponseSchema.safeParse({
      adminTotpExpiresAt: "2026-06-08T12:00:00Z",
      backupCodes: Array.from({ length: 10 }, (_, i) => `code-${i}`),
    });
    expect(result.success).toBe(true);
  });

  it("accepts later-verify response without backup codes", () => {
    const result = AdminTotpVerifyResponseSchema.safeParse({
      adminTotpExpiresAt: "2026-06-08T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 10 backup codes", () => {
    const result = AdminTotpVerifyResponseSchema.safeParse({
      adminTotpExpiresAt: "2026-06-08T12:00:00Z",
      backupCodes: Array.from({ length: 9 }, (_, i) => `code-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 backup codes", () => {
    const result = AdminTotpVerifyResponseSchema.safeParse({
      adminTotpExpiresAt: "2026-06-08T12:00:00Z",
      backupCodes: Array.from({ length: 11 }, (_, i) => `code-${i}`),
    });
    expect(result.success).toBe(false);
  });
});

// ── Admin constants ──

describe("Admin constants", () => {
  it("has expected report reasons", () => {
    expect(ReportReason.Spam).toBe("spam");
    expect(ReportReason.Scam).toBe("scam");
    expect(ReportReason.Misleading).toBe("misleading");
    expect(ReportReason.WrongCategory).toBe("wrong_category");
    expect(ReportReason.Harassment).toBe("harassment");
    expect(ReportReason.Other).toBe("other");
  });

  it("has expected content report statuses", () => {
    expect(ContentReportStatus.Pending).toBe("pending");
    expect(ContentReportStatus.Actioned).toBe("actioned");
    expect(ContentReportStatus.Dismissed).toBe("dismissed");
  });

  it("has expected audit actions", () => {
    expect(AdminAuditAction.AdminBootstrapPromote).toBe(
      "ADMIN_BOOTSTRAP_PROMOTE",
    );
    expect(AdminAuditAction.ListingBan).toBe("LISTING_BAN");
    expect(AdminAuditAction.ListingUnban).toBe("LISTING_UNBAN");
    expect(AdminAuditAction.UserSuspend).toBe("USER_SUSPEND");
    expect(AdminAuditAction.UserUnsuspend).toBe("USER_UNSUSPEND");
    expect(AdminAuditAction.ContentReportResolve).toBe(
      "CONTENT_REPORT_RESOLVE",
    );
    expect(AdminAuditAction.ReviewerOtpBypassLogin).toBe(
      "REVIEWER_OTP_BYPASS_LOGIN",
    );
  });

  it("has expected canonical error reasons", () => {
    expect(AdminErrorReason.ReportTargetNotReportable).toBe(
      "REPORT_TARGET_NOT_REPORTABLE",
    );
    expect(AdminErrorReason.SelfReportNotAllowed).toBe(
      "SELF_REPORT_NOT_ALLOWED",
    );
    expect(AdminErrorReason.TotpAlreadyEnrolled).toBe("TOTP_ALREADY_ENROLLED");
    expect(AdminErrorReason.ReportTargetMismatch).toBe(
      "REPORT_TARGET_MISMATCH",
    );
    expect(AdminErrorReason.ReportAlreadyResolved).toBe(
      "REPORT_ALREADY_RESOLVED",
    );
    expect(AdminErrorReason.ReportTargetNotActionable).toBe(
      "REPORT_TARGET_NOT_ACTIONABLE",
    );
    expect(AdminErrorReason.ModerationTargetStateConflict).toBe(
      "MODERATION_TARGET_STATE_CONFLICT",
    );
    expect(AdminErrorReason.AdminTargetNotModeratable).toBe(
      "ADMIN_TARGET_NOT_MODERATABLE",
    );
    expect(AdminErrorReason.SelfModerationNotAllowed).toBe(
      "SELF_MODERATION_NOT_ALLOWED",
    );
    expect(AdminErrorReason.UserSuspended).toBe("USER_SUSPENDED");
    expect(AdminErrorReason.FeatureDisabled).toBe("FEATURE_DISABLED");
  });
});

// ── Report creation ──

describe("CreateReportRequestSchema", () => {
  it("accepts a valid report with optional details", () => {
    const result = CreateReportRequestSchema.safeParse({
      reason: "spam",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid report with details", () => {
    const result = CreateReportRequestSchema.safeParse({
      reason: "scam",
      details: "This looks fraudulent",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid reason", () => {
    const result = CreateReportRequestSchema.safeParse({
      reason: "invalid_reason",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing details when reason is other", () => {
    const result = CreateReportRequestSchema.safeParse({
      reason: "other",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty trimmed details when reason is other", () => {
    const result = CreateReportRequestSchema.safeParse({
      reason: "other",
      details: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects details over 1000 chars", () => {
    const result = CreateReportRequestSchema.safeParse({
      reason: "other",
      details: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts details at exactly 1000 chars", () => {
    const result = CreateReportRequestSchema.safeParse({
      reason: "other",
      details: "a".repeat(1000),
    });
    expect(result.success).toBe(true);
  });
});

describe("CreateReportResponseSchema", () => {
  it("accepts a valid new report response", () => {
    const result = CreateReportResponseSchema.safeParse({
      reportId: validUuid,
      status: "pending",
      createdAt: "2026-06-08T12:00:00Z",
      reusedExisting: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a duplicate reuse response", () => {
    const result = CreateReportResponseSchema.safeParse({
      reportId: validUuid,
      status: "pending",
      createdAt: "2026-06-08T12:00:00Z",
      reusedExisting: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing reusedExisting", () => {
    const result = CreateReportResponseSchema.safeParse({
      reportId: validUuid,
      status: "pending",
      createdAt: "2026-06-08T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

// ── Report list ──

const validTargetSummary = {
  available: true,
  label: "2020 Toyota Camry",
  targetType: "listing" as const,
  targetId: validUuid,
};

const validReportListItem = {
  id: validUuid,
  status: "pending" as const,
  createdAt: "2026-06-08T12:00:00Z",
  reason: "spam" as const,
  targetType: "listing" as const,
  targetId: validUuid,
  targetSummary: validTargetSummary,
};

describe("ReportListItemSchema", () => {
  it("accepts a valid report list item", () => {
    const result = ReportListItemSchema.safeParse(validReportListItem);
    expect(result.success).toBe(true);
  });

  it("accepts unavailable target summary", () => {
    const result = ReportListItemSchema.safeParse({
      ...validReportListItem,
      targetSummary: {
        available: false,
        label: "Unavailable target",
        targetType: "listing",
        targetId: validUuid,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = ReportListItemSchema.safeParse({
      ...validReportListItem,
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("ListReportsResponseSchema", () => {
  it("accepts a valid list response", () => {
    const result = ListReportsResponseSchema.safeParse({
      items: [validReportListItem],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ── Report detail ──

describe("GetReportDetailResponseSchema", () => {
  it("accepts a valid detail response", () => {
    const result = GetReportDetailResponseSchema.safeParse({
      id: validUuid,
      status: "pending",
      reason: "spam",
      createdAt: "2026-06-08T12:00:00Z",
      reporter: {
        available: true,
        label: "Reporter Name",
        userId: validUuid,
      },
      target: {
        targetType: "listing",
        available: true,
        label: "2020 Toyota Camry",
        targetId: validUuid,
        title: "Great car",
        year: 2020,
        make: "Toyota",
        model: "Camry",
        status: "active",
      },
      targetModerationState: {
        status: "active",
      },
      pendingReportsOnTargetCount: 3,
    });
    expect(result.success).toBe(true);
  });

  it("accepts deleted reporter without count", () => {
    const result = GetReportDetailResponseSchema.safeParse({
      id: validUuid,
      status: "pending",
      reason: "spam",
      createdAt: "2026-06-08T12:00:00Z",
      reporter: {
        available: false,
        label: "Deleted user",
      },
      target: {
        targetType: "user",
        available: true,
        label: "Target User",
        targetId: validUuid,
        role: "seller",
      },
      pendingReportsOnTargetCount: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid datetime", () => {
    const result = GetReportDetailResponseSchema.safeParse({
      id: validUuid,
      status: "pending",
      reason: "spam",
      createdAt: "not-a-datetime",
      reporter: { available: true, label: "Reporter" },
      target: {
        targetType: "listing",
        available: true,
        label: "Car",
        targetId: validUuid,
      },
      pendingReportsOnTargetCount: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ── Moderation commands ──

describe("DismissReportRequestSchema", () => {
  it("accepts a valid dismiss request", () => {
    const result = DismissReportRequestSchema.safeParse({
      reason: "Spam report, no action needed",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty reason after trim", () => {
    const result = DismissReportRequestSchema.safeParse({
      reason: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects reason over 1000 chars", () => {
    const result = DismissReportRequestSchema.safeParse({
      reason: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("DismissReportResponseSchema", () => {
  it("accepts a valid dismiss response", () => {
    const result = DismissReportResponseSchema.safeParse({
      reportId: validUuid,
      status: "dismissed",
      reviewedAt: "2026-06-08T12:00:00Z",
      auditLogId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects status other than dismissed", () => {
    const result = DismissReportResponseSchema.safeParse({
      reportId: validUuid,
      status: "pending",
      reviewedAt: "2026-06-08T12:00:00Z",
      auditLogId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});

describe("BanListingRequestSchema", () => {
  it("accepts a valid ban request with reportId", () => {
    const result = BanListingRequestSchema.safeParse({
      reason: "Fraudulent listing",
      reportId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid direct ban request without reportId", () => {
    const result = BanListingRequestSchema.safeParse({
      reason: "Fraudulent listing",
    });
    expect(result.success).toBe(true);
  });
});

describe("BanListingResponseSchema", () => {
  it("accepts a valid report-backed ban response", () => {
    const result = BanListingResponseSchema.safeParse({
      targetId: validUuid,
      targetState: { status: "banned" },
      reportId: validUuid,
      reportStatus: "actioned",
      auditLogId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid direct ban response", () => {
    const result = BanListingResponseSchema.safeParse({
      targetId: validUuid,
      targetState: { status: "banned" },
      auditLogId: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

describe("UnbanListingRequestSchema", () => {
  it("accepts a valid unban request", () => {
    const result = UnbanListingRequestSchema.safeParse({
      reason: "Mistaken ban",
    });
    expect(result.success).toBe(true);
  });

  it("rejects reportId in unban request", () => {
    const result = UnbanListingRequestSchema.safeParse({
      reason: "Mistaken ban",
      reportId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});

describe("UnbanListingResponseSchema", () => {
  it("accepts a valid unban response", () => {
    const result = UnbanListingResponseSchema.safeParse({
      targetId: validUuid,
      targetState: { status: "active" },
      auditLogId: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

describe("SuspendUserRequestSchema", () => {
  it("accepts a valid suspend request with reportId", () => {
    const result = SuspendUserRequestSchema.safeParse({
      reason: "Harassment",
      reportId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid direct suspend request", () => {
    const result = SuspendUserRequestSchema.safeParse({
      reason: "Harassment",
    });
    expect(result.success).toBe(true);
  });
});

describe("SuspendUserResponseSchema", () => {
  it("accepts a valid report-backed suspend response", () => {
    const result = SuspendUserResponseSchema.safeParse({
      targetId: validUuid,
      targetState: { suspendedAt: "2026-06-08T12:00:00Z" },
      reportId: validUuid,
      reportStatus: "actioned",
      auditLogId: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

describe("UnsuspendUserRequestSchema", () => {
  it("accepts a valid unsuspend request", () => {
    const result = UnsuspendUserRequestSchema.safeParse({
      reason: "Appeal accepted",
    });
    expect(result.success).toBe(true);
  });

  it("rejects reportId in unsuspend request", () => {
    const result = UnsuspendUserRequestSchema.safeParse({
      reason: "Appeal accepted",
      reportId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});

describe("UnsuspendUserResponseSchema", () => {
  it("accepts a valid unsuspend response", () => {
    const result = UnsuspendUserResponseSchema.safeParse({
      targetId: validUuid,
      targetState: { suspendedAt: null },
      auditLogId: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

// ── Audit ──

const validActorSummary = {
  id: validUuid,
  label: "Admin User",
};

describe("AuditLogListItemSchema", () => {
  it("accepts a valid audit list item", () => {
    const result = AuditLogListItemSchema.safeParse({
      id: validUuid,
      createdAt: "2026-06-08T12:00:00Z",
      action: "LISTING_BAN",
      actorSummary: validActorSummary,
      targetType: "listing",
      targetId: validUuid,
      targetLabel: "2020 Toyota Camry",
      reasonPreview: "Fraudulent listing",
    });
    expect(result.success).toBe(true);
  });

  it("accepts operator script actor", () => {
    const result = AuditLogListItemSchema.safeParse({
      id: validUuid,
      createdAt: "2026-06-08T12:00:00Z",
      action: "ADMIN_BOOTSTRAP_PROMOTE",
      actorSummary: {
        label: "Operator script",
      },
      targetType: "user",
      targetId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts reviewer OTP bypass audit entries", () => {
    const result = AuditLogListItemSchema.safeParse({
      id: validUuid,
      createdAt: "2026-07-22T12:00:00Z",
      action: "REVIEWER_OTP_BYPASS_LOGIN",
      actorSummary: {
        label: "Operator script",
      },
      targetType: "user",
      targetId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = AuditLogListItemSchema.safeParse({
      id: validUuid,
      createdAt: "2026-06-08T12:00:00Z",
      action: "INVALID_ACTION",
      actorSummary: validActorSummary,
      targetType: "listing",
      targetId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});

describe("ListAuditEntriesResponseSchema", () => {
  it("accepts a valid audit list response", () => {
    const result = ListAuditEntriesResponseSchema.safeParse({
      items: [
        {
          id: validUuid,
          createdAt: "2026-06-08T12:00:00Z",
          action: "LISTING_BAN",
          actorSummary: validActorSummary,
          targetType: "listing",
          targetId: validUuid,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ── Pagination ──

describe("AdminTablePaginationRequestSchema", () => {
  it("defaults to page 1 and pageSize 50", () => {
    const result = AdminTablePaginationRequestSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("accepts pageSize up to 100", () => {
    const result = AdminTablePaginationRequestSchema.safeParse({
      pageSize: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects pageSize over 100", () => {
    const result = AdminTablePaginationRequestSchema.safeParse({
      pageSize: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects page below 1", () => {
    const result = AdminTablePaginationRequestSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });
});

// ── OpenAPI document ──

describe("OpenAPI document — S7 schemas", () => {
  it("contains admin TOTP schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("AdminTotpStatusResponse");
    expect(doc.components.schemas).toHaveProperty("AdminTotpEnrollResponse");
    expect(doc.components.schemas).toHaveProperty("AdminTotpVerifyRequest");
    expect(doc.components.schemas).toHaveProperty("AdminTotpVerifyResponse");
  });

  it("contains report schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("CreateReportRequest");
    expect(doc.components.schemas).toHaveProperty("CreateReportResponse");
    expect(doc.components.schemas).toHaveProperty("ReportListItem");
    expect(doc.components.schemas).toHaveProperty("ListReportsResponse");
    expect(doc.components.schemas).toHaveProperty("GetReportDetailResponse");
  });

  it("contains moderation command schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("DismissReportRequest");
    expect(doc.components.schemas).toHaveProperty("DismissReportResponse");
    expect(doc.components.schemas).toHaveProperty("BanListingRequest");
    expect(doc.components.schemas).toHaveProperty("BanListingResponse");
    expect(doc.components.schemas).toHaveProperty("UnbanListingRequest");
    expect(doc.components.schemas).toHaveProperty("UnbanListingResponse");
    expect(doc.components.schemas).toHaveProperty("SuspendUserRequest");
    expect(doc.components.schemas).toHaveProperty("SuspendUserResponse");
    expect(doc.components.schemas).toHaveProperty("UnsuspendUserRequest");
    expect(doc.components.schemas).toHaveProperty("UnsuspendUserResponse");
  });

  it("contains audit schemas", () => {
    const doc = generateOpenApiDocument() as {
      components: { schemas: Record<string, unknown> };
    };
    expect(doc.components.schemas).toHaveProperty("AuditLogListItem");
    expect(doc.components.schemas).toHaveProperty("ListAuditEntriesResponse");
  });

  it("is reproducible (generate twice → identical)", () => {
    const doc1 = JSON.stringify(generateOpenApiDocument(), null, 2);
    const doc2 = JSON.stringify(generateOpenApiDocument(), null, 2);
    expect(doc1).toBe(doc2);
  });
});
