import { describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { UserSuspendedError } from "../domain/UserSuspendedError";
import type { VerifyOtp } from "../application/VerifyOtp";
import type { RefreshSession } from "../application/RefreshSession";
import { AuthController } from "./AuthController";

describe("suspended authentication refusals", () => {
  it.each(["sign-in", "refresh"] as const)("maps %s refusal to the shared suspension reason", async (operation) => {
    const refusal = { execute: async () => { throw new UserSuspendedError(); } };
    const controller = new AuthController(
      {} as ConstructorParameters<typeof AuthController>[0],
      refusal as unknown as VerifyOtp, refusal as unknown as RefreshSession,
      {} as ConstructorParameters<typeof AuthController>[3],
      {} as ConstructorParameters<typeof AuthController>[4],
    );
    const result = operation === "sign-in"
      ? controller.otpVerify({ phone: "+99361234567", code: "123456" }, { headers: {} } as FastifyRequest)
      : controller.refresh({ refreshToken: "a".repeat(64) });
    const error = await result.catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({ code: "FORBIDDEN", details: { reason: "USER_SUSPENDED" } });
  });
});
