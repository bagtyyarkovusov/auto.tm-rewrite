import { describe, it, expect, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { NotificationsController } from "./notifications.controller";
import type { RegisterPushToken } from "../application/RegisterPushToken";
import type { RevokePushToken } from "../application/RevokePushToken";
import type { ListPushTokens } from "../application/ListPushTokens";

function makeController() {
  const registerPushTokenUC = { execute: vi.fn() } as unknown as RegisterPushToken;
  const revokePushTokenUC = { execute: vi.fn() } as unknown as RevokePushToken;
  const listPushTokensUC = { execute: vi.fn() } as unknown as ListPushTokens;

  const controller = new NotificationsController(
    registerPushTokenUC,
    revokePushTokenUC,
    listPushTokensUC,
  );
  return { controller, registerPushTokenUC };
}

function userReq(): FastifyRequest {
  return { user: { sub: "user-1" } } as unknown as FastifyRequest;
}

describe("NotificationsController", () => {
  describe("invalid request", () => {
    it("POST /tokens answers 400 VALIDATION_FAILED, not 500", async () => {
      const { controller, registerPushTokenUC } = makeController();

      const error = await controller
        .registerPushToken({ token: "", platform: "windows-phone" }, userReq())
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: "VALIDATION_FAILED",
      });
      expect(registerPushTokenUC.execute).not.toHaveBeenCalled();
    });
  });
});
