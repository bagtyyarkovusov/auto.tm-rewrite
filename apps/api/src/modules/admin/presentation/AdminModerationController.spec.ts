import "reflect-metadata";

import { describe, it, expect, vi } from "vitest";
import { BadRequestException, ForbiddenException, RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import type { ConfigService } from "@nestjs/config";
import type { FastifyRequest } from "fastify";

import { AdminModerationController } from "./AdminModerationController";
import type { BanListing } from "../application/BanListing";
import type { UnbanListing } from "../application/UnbanListing";
import type { SuspendUser } from "../application/SuspendUser";
import type { UnsuspendUser } from "../application/UnsuspendUser";
import type { DismissReport } from "../application/DismissReport";
import type { RemoveUserPhoto } from "../application/RemoveUserPhoto";
import { AdminGuard } from "../../../common/admin.guard";
import type { Env } from "../../../env.schema";

function makeController(opts: {
  moderationActionsEnabled?: boolean;
} = {}) {
  const banListingUC = { execute: vi.fn().mockResolvedValue({ targetId: "l1", targetState: { status: "banned" }, auditLogId: "a1" }) } as unknown as BanListing;
  const unbanListingUC = { execute: vi.fn().mockResolvedValue({ targetId: "l1", targetState: { status: "active" }, auditLogId: "a1" }) } as unknown as UnbanListing;
  const suspendUserUC = { execute: vi.fn().mockResolvedValue({ targetId: "u1", targetState: { suspendedAt: new Date(), suspendedById: "admin-1", suspensionReason: "spam" }, auditLogId: "a1" }) } as unknown as SuspendUser;
  const unsuspendUserUC = { execute: vi.fn().mockResolvedValue({ targetId: "u1", targetState: { suspendedAt: null, suspendedById: null, suspensionReason: null }, auditLogId: "a1" }) } as unknown as UnsuspendUser;
  const dismissReportUC = { execute: vi.fn().mockResolvedValue({ reportId: "r1", status: "dismissed", reviewedAt: new Date().toISOString(), auditLogId: "a1" }) } as unknown as DismissReport;

  const removeUserPhotoUC = { execute: vi.fn().mockResolvedValue({ targetId: "u1", targetState: { avatarKey: null, avatarIndex: 7 }, reportId: "r1", reportStatus: "actioned", auditLogId: "a1" }) } as unknown as RemoveUserPhoto;

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
    removeUserPhotoUC,
    config,
  );

  return { controller, banListingUC, unbanListingUC, suspendUserUC, unsuspendUserUC, dismissReportUC, removeUserPhotoUC, config };
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

  describe("removeUserPhoto (POST users/:id/remove-photo)", () => {
    it("is a POST answering 200 behind the admin guard", () => {
      const handler = AdminModerationController.prototype.removeUserPhoto;
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe("users/:id/remove-photo");
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(200);
      expect(Reflect.getMetadata(GUARDS_METADATA, AdminModerationController)).toEqual([AdminGuard]);
    });

    it("is blocked with FEATURE_DISABLED when moderation actions are off", async () => {
      const { controller, removeUserPhotoUC } = makeController({ moderationActionsEnabled: false });

      const error = await controller
        .removeUserPhoto("u1", { reason: "Offensive photo" }, adminReq())
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        details: { reason: "FEATURE_DISABLED" },
      });
      expect(removeUserPhotoUC.execute).not.toHaveBeenCalled();
    });

    it("passes the moderator, the target, the reason and the report to the use-case", async () => {
      const { controller, removeUserPhotoUC } = makeController();
      const reportId = "0b9f3c1e-2d4a-4c6b-8e1f-3a5b7c9d1e2f";

      const result = await controller.removeUserPhoto(
        "u1",
        { reason: "Offensive photo", reportId },
        adminReq(),
      );

      expect(removeUserPhotoUC.execute).toHaveBeenCalledWith({
        userId: "u1",
        adminUserId: "admin-1",
        reason: "Offensive photo",
        reportId,
      });
      expect(result).toEqual({
        targetId: "u1",
        targetState: { avatarKey: null, avatarIndex: 7 },
        reportId: "r1",
        reportStatus: "actioned",
        auditLogId: "a1",
      });
    });
  });

  describe("invalid request", () => {
    it.each([
      ["removeUserPhoto", "u1"],
      ["dismissReport", "r1"],
      ["banListing", "l1"],
      ["unbanListing", "l1"],
      ["suspendUser", "u1"],
      ["unsuspendUser", "u1"],
    ] as const)("%s answers 400 VALIDATION_FAILED, not 500", async (action, targetId) => {
      const { controller, ...useCases } = makeController({ moderationActionsEnabled: true });
      const useCase = useCases[`${action}UC`];

      const error = await controller[action](targetId, { reason: 42 }, adminReq()).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({ code: "VALIDATION_FAILED" });
      expect(useCase.execute).not.toHaveBeenCalled();
    });
  });
});
