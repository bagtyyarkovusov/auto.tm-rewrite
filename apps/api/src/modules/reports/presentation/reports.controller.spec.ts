import { describe, it, expect, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import { ReportsController } from "./reports.controller";
import type { CreateInspectionInterest } from "../application/CreateInspectionInterest";
import type { ListInspectionInterestStats } from "../application/ListInspectionInterestStats";
import { InspectionInterest } from "../domain/InspectionInterest";
import type { Env } from "../../../env.schema";

function makeController(opts: { inspectionInterestEnabled?: boolean } = {}) {
  const createInterestUC = {
    execute: vi.fn().mockResolvedValue({
      interest: InspectionInterest.create({
        id: "interest-1",
        listingId: "listing-1",
        requesterUserId: "user-1",
        side: "buyer",
        willingnessToPayTmt: 5000,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      }),
      reusedExisting: false,
    }),
  } as unknown as CreateInspectionInterest;

  const listStatsUC = {
    execute: vi.fn().mockResolvedValue({
      items: [
        {
          listingId: "listing-1",
          totalInterest: 1,
          buyerInterest: 1,
          sellerInterest: 0,
          willingnessToPayTmtSum: 5000,
          willingnessToPayTmtCount: 1,
          willingnessToPayTmtAvg: 5000,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    }),
  } as unknown as ListInspectionInterestStats;

  const config = {
    get: vi.fn((key: keyof Env) => {
      if (key === "INSPECTION_INTEREST_ENABLED")
        return opts.inspectionInterestEnabled ?? true;
      return undefined;
    }),
  } as unknown as ConfigService<Env, true>;

  const controller = new ReportsController(
    createInterestUC,
    listStatsUC,
    config,
  );
  return { controller, createInterestUC, listStatsUC, config };
}

describe("ReportsController", () => {
  describe("INSPECTION_INTEREST_ENABLED=false", () => {
    it("blocks POST /listings/:id/inspection-interest with FEATURE_DISABLED", async () => {
      const { controller } = makeController({
        inspectionInterestEnabled: false,
      });
      const req = { user: { sub: "user-1" } } as unknown as Parameters<
        typeof controller.createInspectionInterest
      >[2];
      const res = { status: vi.fn() } as unknown as Parameters<
        typeof controller.createInspectionInterest
      >[3];

      await expect(
        controller.createInspectionInterest("listing-1", {}, req, res),
      ).rejects.toThrow(ForbiddenException);
    });

    it("still allows GET /admin/inspection-interests", async () => {
      const { controller } = makeController({
        inspectionInterestEnabled: false,
      });
      const result = await controller.listInspectionInterestStats(
        undefined,
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe("INSPECTION_INTEREST_ENABLED=true", () => {
    it("allows POST /listings/:id/inspection-interest", async () => {
      const { controller } = makeController({
        inspectionInterestEnabled: true,
      });
      const req = { user: { sub: "user-1" } } as unknown as Parameters<
        typeof controller.createInspectionInterest
      >[2];
      const res = { status: vi.fn() } as unknown as Parameters<
        typeof controller.createInspectionInterest
      >[3];

      const result = await controller.createInspectionInterest(
        "listing-1",
        { willingnessToPayTmt: 5000 },
        req,
        res,
      );
      expect(result.id).toBe("interest-1");
      expect(result.side).toBe("buyer");
    });

    it("returns admin stats", async () => {
      const { controller } = makeController({
        inspectionInterestEnabled: true,
      });
      const result = await controller.listInspectionInterestStats(
        undefined,
        undefined,
      );
      expect(result.items[0]?.willingnessToPayTmtAvg).toBe(5000);
    });
  });
});
