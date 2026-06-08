import { describe, it, expect, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { FastifyRequest } from "fastify";

import { AdminModerationController } from "./AdminModerationController";
import type { BanListing } from "../application/BanListing";
import type { UnbanListing } from "../application/UnbanListing";
import type { SuspendUser } from "../application/SuspendUser";
import type { UnsuspendUser } from "../application/UnsuspendUser";
import type { DismissReport } from "../application/DismissReport";
import type { Env } from "../../../env.schema";

function makeController(opts: {
  moderationActionsEnabled?: boolean;
} = {}) {
  const banListingUC = { execute: vi.fn().mockResolvedValue({ targetId: "l1", targetState: { status: "banned" }, auditLogId: "a1" }) } as unknown as BanListing;
  const unbanListingUC = { execute: vi.fn().mockResolvedValue({ targetId: "l1", targetState: { status: "active" }, auditLogId: "a1" }) } as unknown as UnbanListing;
  const suspendUserUC = { execute: vi.fn().mockResolvedValue({ targetId: "u1", targetState: { suspendedAt: new Date(), suspendedById: "admin-1", suspensionReason: "spam" }, auditLogId: "a1" }) } as unknown as SuspendUser;
  const unsuspendUserUC = { execute: vi.fn().mockResolvedValue({ targetId: "u1", targetState: { suspendedAt: null, suspendedById: null, suspensionReason: null }, auditLogId: "a1" }) } as unknown as UnsuspendUser;
  const dismissReportUC = { execute: vi.fn().mockResolvedValue({ reportId: "r1", status: "dismissed", reviewedAt: new Date().toISOString(), auditLogId: "a1" }) } as unknown as DismissReport;

  const config = {
    get: vi.fn((key: keyof Env) => {
      if (key === "ADMIN_MODERATION_ACTIONS_ENABLED") return opts.moderationActionsEnabled ?? true;
      return undefined;
    }),
  } as unknown as ConfigService<Env, true>;

  const controller = new AdminModerationController(
    banListingUC,
    unbanListingUC,
    suspendUserUC,
    unsuspendUserUC,
    dismissReportUC,
    config,
  );

  return { controller, banListingUC, unbanListingUC, suspendUserUC, unsuspendUserUC, dismissReportUC, config };
}

function adminReq(): FastifyRequest {
  return { user: { sub: "admin-1" } } as unknown as FastifyRequest;
}

describe("AdminModerationController", () => {
  describe("ADMIN_MODERATION_ACTIONS_ENABLED=false", () => {
    it("blocks dismissReport with FEATURE_DISABLED", async () => {
      const { controller } = makeController({ moderationActionsEnabled: false });
      await expect(
        controller.dismissReport("r1", { reason: "Not a violation" }, adminReq()),
      ).rejects.toThrow(ForbiddenException);
    });

    it("blocks banListing with FEATURE_DISABLED", async () => {
      const { controller } = makeController({ moderationActionsEnabled: false });
      await expect(
        controller.banListing("l1", { reason: "Spam" }, adminReq()),
      ).rejects.toThrow(ForbiddenException);
    });

    it("blocks unbanListing with FEATURE_DISABLED", async () => {
      const { controller } = makeController({ moderationActionsEnabled: false });
      await expect(
        controller.unbanListing("l1", { reason: "Mistaken" }, adminReq()),
      ).rejects.toThrow(ForbiddenException);
    });

    it("blocks suspendUser with FEATURE_DISABLED", async () => {
      const { controller } = makeController({ moderationActionsEnabled: false });
      await expect(
        controller.suspendUser("u1", { reason: "Spam" }, adminReq()),
      ).rejects.toThrow(ForbiddenException);
    });

    it("blocks unsuspendUser with FEATURE_DISABLED", async () => {
      const { controller } = makeController({ moderationActionsEnabled: false });
      await expect(
        controller.unsuspendUser("u1", { reason: "Mistaken" }, adminReq()),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("ADMIN_MODERATION_ACTIONS_ENABLED=true", () => {
    it("allows dismissReport", async () => {
      const { controller } = makeController({ moderationActionsEnabled: true });
      const result = await controller.dismissReport("r1", { reason: "Not a violation" }, adminReq());
      expect(result.reportId).toBe("r1");
    });

    it("allows banListing", async () => {
      const { controller } = makeController({ moderationActionsEnabled: true });
      const result = await controller.banListing("l1", { reason: "Spam" }, adminReq());
      expect(result.targetId).toBe("l1");
    });
  });
});
