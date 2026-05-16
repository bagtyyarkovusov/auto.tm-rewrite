import { describe, it, expect, beforeEach } from "vitest";
import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import type { IdentityCheckPort } from "../modules/identity/domain/ports/IdentityCheckPort";

class FakeIdentityCheckPort implements IdentityCheckPort {
  private users = new Map<string, boolean>();

  setAdmin(userId: string, isAdmin: boolean): void {
    this.users.set(userId, isAdmin);
  }

  async isAdmin(userId: string): Promise<boolean> {
    return this.users.get(userId) ?? false;
  }

  async isInDealership(): Promise<boolean> {
    return false;
  }
}

function makeContext(
  user?: { sub: string },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("AdminGuard", () => {
  let guard: AdminGuard;
  let fakePort: FakeIdentityCheckPort;

  beforeEach(() => {
    fakePort = new FakeIdentityCheckPort();
    guard = new AdminGuard(fakePort);
  });

  it("allows admin requests", async () => {
    fakePort.setAdmin("admin-1", true);
    const result = await guard.canActivate(
      makeContext({ sub: "admin-1" }),
    );
    expect(result).toBe(true);
  });

  it("rejects non-admin requests with ForbiddenException", async () => {
    fakePort.setAdmin("buyer-1", false);
    await expect(
      guard.canActivate(makeContext({ sub: "buyer-1" })),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects non-admin with correct error shape", async () => {
    fakePort.setAdmin("buyer-1", false);
    try {
      await guard.canActivate(makeContext({ sub: "buyer-1" }));
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      const response = (err as ForbiddenException).getResponse() as {
        code: string;
        message: string;
      };
      expect(response.code).toBe("FORBIDDEN");
      expect(response.message).toBe("Admin role required");
    }
  });

  it("rejects unauthenticated requests with UnauthorizedException", async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects requests with missing sub", async () => {
    await expect(
      guard.canActivate(makeContext({} as { sub: string })),
    ).rejects.toThrow(UnauthorizedException);
  });
});
