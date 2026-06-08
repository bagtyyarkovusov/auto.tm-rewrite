import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

const mockState = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
  },
  redirect: vi.fn((url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`);
    (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307`;
    throw err;
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockState.cookieStore)),
}));

vi.mock("next/navigation", () => ({
  redirect: mockState.redirect,
}));

import {
  listReports,
  getReportDetail,
  dismissReport,
  banListing,
  unbanListing,
  suspendUser,
  unsuspendUser,
  listAuditEntries,
  getConfig,
} from "./actions";

const mockCookieStore = mockState.cookieStore;

function mockFetch(response: { status: number; body: unknown }) {
  global.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(response.body), { status: response.status }),
    ),
  ) as Mock;
}

function mockFetchSuccess(body: unknown) {
  mockFetch({ status: 200, body });
}

function mockFetchError(status: number, body: unknown) {
  mockFetch({ status, body });
}

describe("moderation server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: "acc_tok" });
  });

  describe("listReports", () => {
    it("returns reports on success", async () => {
      const payload = {
        items: [
          {
            id: "r1",
            status: "pending",
            createdAt: "2026-01-01T00:00:00Z",
            reason: "spam",
            targetType: "listing",
            targetId: "l1",
            targetSummary: {
              available: true,
              label: "Toyota Camry",
              targetType: "listing",
              targetId: "l1",
            },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      };
      mockFetchSuccess(payload);

      const result = await listReports({ status: "pending" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0]?.id).toBe("r1");
      }
    });

    it("returns error on API failure", async () => {
      mockFetchError(400, {
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Invalid filter",
        timestamp: "2026-01-01T00:00:00Z",
        requestId: "req-1",
      });

      const result = await listReports({ status: "invalid" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_FAILED");
      }
    });
  });

  describe("getReportDetail", () => {
    it("returns report detail on success", async () => {
      const payload = {
        id: "r1",
        status: "pending",
        reason: "spam",
        createdAt: "2026-01-01T00:00:00Z",
        reporter: { available: true, label: "User A", userId: "u1" },
        target: {
          targetType: "listing",
          available: true,
          label: "Toyota Camry",
          targetId: "l1",
        },
        targetModerationState: { status: "active" },
        pendingReportsOnTargetCount: 2,
      };
      mockFetchSuccess(payload);

      const result = await getReportDetail("r1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe("r1");
        expect(result.data.pendingReportsOnTargetCount).toBe(2);
      }
    });

    it("returns NOT_FOUND error for missing report", async () => {
      mockFetchError(404, {
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Report not found",
        timestamp: "2026-01-01T00:00:00Z",
        requestId: "req-1",
      });

      const result = await getReportDetail("missing");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("dismissReport", () => {
    it("returns success with auditLogId", async () => {
      const payload = {
        reportId: "r1",
        status: "dismissed",
        reviewedAt: "2026-01-01T00:00:00Z",
        auditLogId: "a1",
      };
      mockFetchSuccess(payload);

      const result = await dismissReport("r1", "Not a violation");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.auditLogId).toBe("a1");
      }

      const [, init] = (global.fetch as Mock).mock.calls[0] ?? [null, {}];
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        reason: "Not a violation",
      });
    });

    it("returns CONFLICT for already resolved report", async () => {
      mockFetchError(409, {
        statusCode: 409,
        code: "CONFLICT",
        message: "Report has already been resolved",
        details: { reason: "REPORT_ALREADY_RESOLVED", reportStatus: "dismissed" },
        timestamp: "2026-01-01T00:00:00Z",
        requestId: "req-1",
      });

      const result = await dismissReport("r1", "Spam");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("CONFLICT");
        const body = result.details as { details?: { reason?: string } };
        expect(body.details?.reason).toBe("REPORT_ALREADY_RESOLVED");
      }
    });
  });

  describe("banListing", () => {
    it("bans listing directly without reportId", async () => {
      const payload = {
        targetId: "l1",
        targetState: { status: "banned" },
        auditLogId: "a1",
      };
      mockFetchSuccess(payload);

      const result = await banListing("l1", "Spam");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.targetState.status).toBe("banned");
      }
    });

    it("bans listing with reportId", async () => {
      const payload = {
        targetId: "l1",
        targetState: { status: "banned" },
        reportId: "r1",
        reportStatus: "actioned",
        auditLogId: "a1",
      };
      mockFetchSuccess(payload);

      const result = await banListing("l1", "Spam", "r1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.reportStatus).toBe("actioned");
      }
    });

    it("returns MODERATION_TARGET_STATE_CONFLICT for non-active listing", async () => {
      mockFetchError(409, {
        statusCode: 409,
        code: "CONFLICT",
        message: "Listing is not in a state that can be banned",
        details: { reason: "MODERATION_TARGET_STATE_CONFLICT", targetState: { status: "sold" } },
        timestamp: "2026-01-01T00:00:00Z",
        requestId: "req-1",
      });

      const result = await banListing("l1", "Spam");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("CONFLICT");
      }
    });
  });

  describe("unbanListing", () => {
    it("unbans listing and returns auditLogId", async () => {
      const payload = {
        targetId: "l1",
        targetState: { status: "active" },
        auditLogId: "a1",
      };
      mockFetchSuccess(payload);

      const result = await unbanListing("l1", "Mistaken ban");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.targetState.status).toBe("active");
      }
    });
  });

  describe("suspendUser", () => {
    it("suspends user directly without reportId", async () => {
      const payload = {
        targetId: "u1",
        targetState: { suspendedAt: "2026-01-01T00:00:00Z", suspendedById: "admin-1", suspensionReason: "Spam" },
        auditLogId: "a1",
      };
      mockFetchSuccess(payload);

      const result = await suspendUser("u1", "Spam");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.targetState.suspendedAt).toBeDefined();
      }
    });

    it("returns ADMIN_TARGET_NOT_MODERATABLE for admin target", async () => {
      mockFetchError(403, {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Admin target cannot be moderated",
        details: { reason: "ADMIN_TARGET_NOT_MODERATABLE" },
        timestamp: "2026-01-01T00:00:00Z",
        requestId: "req-1",
      });

      const result = await suspendUser("u1", "Spam");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("FORBIDDEN");
        const body = result.details as { details?: { reason?: string } };
        expect(body.details?.reason).toBe("ADMIN_TARGET_NOT_MODERATABLE");
      }
    });

    it("returns SELF_MODERATION_NOT_ALLOWED for self target", async () => {
      mockFetchError(403, {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Self moderation not allowed",
        details: { reason: "SELF_MODERATION_NOT_ALLOWED" },
        timestamp: "2026-01-01T00:00:00Z",
        requestId: "req-1",
      });

      const result = await suspendUser("u1", "Spam");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("FORBIDDEN");
        const body = result.details as { details?: { reason?: string } };
        expect(body.details?.reason).toBe("SELF_MODERATION_NOT_ALLOWED");
      }
    });
  });

  describe("unsuspendUser", () => {
    it("unsuspends user and returns auditLogId", async () => {
      const payload = {
        targetId: "u1",
        targetState: { suspendedAt: null, suspendedById: null, suspensionReason: null },
        auditLogId: "a1",
      };
      mockFetchSuccess(payload);

      const result = await unsuspendUser("u1", "Mistaken suspension");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.targetState.suspendedAt).toBeNull();
      }
    });
  });

  describe("listAuditEntries", () => {
    it("returns audit entries on success", async () => {
      const payload = {
        items: [
          {
            id: "a1",
            createdAt: "2026-01-01T00:00:00Z",
            action: "LISTING_BAN",
            actorSummary: { id: "admin-1", label: "Admin A" },
            targetType: "listing",
            targetId: "l1",
            targetLabel: "Toyota Camry",
            reasonPreview: "Spam",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      };
      mockFetchSuccess(payload);

      const result = await listAuditEntries({ action: "LISTING_BAN" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0]?.action).toBe("LISTING_BAN");
      }
    });

    it("renders operator script actor for null actorId", async () => {
      const payload = {
        items: [
          {
            id: "a1",
            createdAt: "2026-01-01T00:00:00Z",
            action: "ADMIN_BOOTSTRAP_PROMOTE",
            actorSummary: { label: "Operator script" },
            targetType: "user",
            targetId: "u1",
            targetLabel: "User A",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      };
      mockFetchSuccess(payload);

      const result = await listAuditEntries({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items[0]?.actorSummary.label).toBe("Operator script");
        expect(result.data.items[0]?.actorSummary.id).toBeUndefined();
      }
    });

    it("returns FEATURE_DISABLED error when moderation is disabled", async () => {
      mockFetchError(403, {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Feature disabled",
        details: { reason: "FEATURE_DISABLED" },
        timestamp: "2026-01-01T00:00:00Z",
        requestId: "req-1",
      });

      const result = await listAuditEntries({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("FORBIDDEN");
        const body = result.details as { details?: { reason?: string } };
        expect(body.details?.reason).toBe("FEATURE_DISABLED");
      }
    });
  });

  describe("getConfig", () => {
    it("returns config on success", async () => {
      mockFetchSuccess({
        reportEntryEnabled: true,
        adminModerationActionsEnabled: false,
      });

      const result = await getConfig();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.reportEntryEnabled).toBe(true);
        expect(result.data.adminModerationActionsEnabled).toBe(false);
      }
    });

    it("returns error on API failure", async () => {
      mockFetchError(500, {
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "Server error",
        timestamp: "2026-01-01T00:00:00Z",
        requestId: "req-1",
      });

      const result = await getConfig();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INTERNAL_ERROR");
      }
    });
  });
});
