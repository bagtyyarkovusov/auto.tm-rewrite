import { describe, it, expect, vi } from "vitest";
import { ForbiddenException, BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { FastifyReply, FastifyRequest } from "fastify";

import { ReportsController } from "./ReportsController";
import type { CreateReport, CreateReportResult } from "../application/CreateReport";
import type { CreateMessageReport, CreateMessageReportResult } from "../application/CreateMessageReport";
import type { ListReports } from "../application/ListReports";
import type { GetReportDetail } from "../application/GetReportDetail";
import type { Env } from "../../../env.schema";
import { ContentReport } from "../domain/ContentReport";

function makeController(opts: {
  reportEntryEnabled?: boolean;
} = {}) {
  const createReportUC = {
    execute: vi.fn().mockResolvedValue({
      report: ContentReport.create({
        id: "report-1",
        reporterUserId: "user-1",
        targetType: "listing",
        targetId: "listing-1",
        reason: "spam",
        details: null,
        messageContext: null,
      }),
      reusedExisting: false,
    } as CreateReportResult),
  } as unknown as CreateReport;

  const createMessageReportUC = {
    execute: vi.fn().mockResolvedValue({
      report: ContentReport.create({
        id: "report-2",
        reporterUserId: "user-1",
        targetType: "message",
        targetId: "message-1",
        reason: "spam",
        details: null,
        messageContext: null,
      }),
      reusedExisting: false,
    } as CreateMessageReportResult),
  } as unknown as CreateMessageReport;

  const listReportsUC = {
    execute: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    }),
  } as unknown as ListReports;

  const getReportDetailUC = {
    execute: vi.fn().mockResolvedValue({
      id: "report-1",
      status: "pending",
      reason: "spam",
      details: null,
      createdAt: new Date(),
      reporter: { available: true, label: "User", userId: "user-1" },
      target: { targetType: "listing" as const, available: true, label: "Car", targetId: "listing-1" },
      pendingReportsOnTargetCount: 0,
    }),
  } as unknown as GetReportDetail;

  const config = {
    get: vi.fn((key: keyof Env) => {
      if (key === "REPORT_ENTRY_ENABLED") return opts.reportEntryEnabled ?? true;
      return undefined;
    }),
  } as unknown as ConfigService<Env, true>;

  const controller = new ReportsController(createReportUC, createMessageReportUC, listReportsUC, getReportDetailUC, config);
  return { controller, createReportUC, createMessageReportUC, listReportsUC, getReportDetailUC, config };
}

describe("ReportsController", () => {
  describe("REPORT_ENTRY_ENABLED=false", () => {
    it("blocks POST /listings/:id/report with FEATURE_DISABLED", async () => {
      const { controller } = makeController({ reportEntryEnabled: false });
      const req = { user: { sub: "user-1" } } as unknown as Parameters<typeof controller.reportListing>[2];
      const res = { status: vi.fn() } as unknown as Parameters<typeof controller.reportListing>[3];

      await expect(
        controller.reportListing("listing-1", { reason: "spam" }, req, res),
      ).rejects.toThrow(ForbiddenException);
    });

    it("blocks POST /users/:id/report with FEATURE_DISABLED", async () => {
      const { controller } = makeController({ reportEntryEnabled: false });
      const req = { user: { sub: "user-1" } } as unknown as Parameters<typeof controller.reportUser>[2];
      const res = { status: vi.fn() } as unknown as Parameters<typeof controller.reportUser>[3];

      await expect(
        controller.reportUser("user-2", { reason: "harassment" }, req, res),
      ).rejects.toThrow(ForbiddenException);
    });

    it("still allows GET /admin/reports", async () => {
      const { controller } = makeController({ reportEntryEnabled: false });
      const result = await controller.listReports("pending", undefined, undefined, undefined);
      expect(result.items).toEqual([]);
    });

    it("still allows GET /admin/reports/:id", async () => {
      const { controller } = makeController({ reportEntryEnabled: false });
      const result = await controller.getReportDetail("report-1");
      expect(result.id).toBe("report-1");
    });
  });

  describe("REPORT_ENTRY_ENABLED=true", () => {
    it("allows POST /listings/:id/report", async () => {
      const { controller } = makeController({ reportEntryEnabled: true });
      const req = { user: { sub: "user-1" } } as unknown as Parameters<typeof controller.reportListing>[2];
      const res = { status: vi.fn() } as unknown as Parameters<typeof controller.reportListing>[3];

      const result = await controller.reportListing("listing-1", { reason: "spam" }, req, res);
      expect(result.reportId).toBe("report-1");
    });
  });

  describe("invalid request", () => {
    const req = { user: { sub: "user-1" } } as unknown as FastifyRequest;
    const res = { status: vi.fn() } as unknown as FastifyReply;

    async function expectValidationFailed(promise: Promise<unknown>) {
      const error = await promise.catch((err: unknown) => err);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({ code: "VALIDATION_FAILED" });
    }

    it("POST /listings/:id/report answers 400 VALIDATION_FAILED, not 500", async () => {
      const { controller, createReportUC } = makeController({ reportEntryEnabled: true });
      await expectValidationFailed(controller.reportListing("listing-1", { reason: "not-a-reason" }, req, res));
      expect(createReportUC.execute).not.toHaveBeenCalled();
    });

    it("POST /users/:id/report answers 400 VALIDATION_FAILED, not 500", async () => {
      const { controller, createReportUC } = makeController({ reportEntryEnabled: true });
      await expectValidationFailed(controller.reportUser("user-2", {}, req, res));
      expect(createReportUC.execute).not.toHaveBeenCalled();
    });

    it("POST /conversations/:id/messages/:id/report answers 400 VALIDATION_FAILED, not 500", async () => {
      const { controller, createMessageReportUC } = makeController({ reportEntryEnabled: true });
      await expectValidationFailed(controller.reportMessage("conversation-1", "message-1", { reason: 42 }, req, res));
      expect(createMessageReportUC.execute).not.toHaveBeenCalled();
    });
  });
});

