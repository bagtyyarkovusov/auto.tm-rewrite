import { describe, it, expect, vi } from "vitest";

import {
  runPromoteAdmin,
  type PromoteAdminDeps,
  type PromoteAdminOptions,
} from "./promote-admin";

function createDeps(overrides?: Partial<PromoteAdminDeps>): PromoteAdminDeps {
  return {
    findUserByPhone: vi.fn().mockResolvedValue(null),
    updateUserRole: vi.fn().mockResolvedValue(undefined),
    createAuditLog: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("runPromoteAdmin", () => {
  const validOptions: PromoteAdminOptions = {
    phone: "+99361234567",
    reason: "bootstrap first admin",
    dryRun: false,
  };

  it("returns error for invalid phone format", async () => {
    const deps = createDeps();
    const result = await runPromoteAdmin(deps, {
      ...validOptions,
      phone: "invalid",
    });
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("Invalid phone format");
    expect(deps.findUserByPhone).not.toHaveBeenCalled();
  });

  it("returns error for empty reason after trim", async () => {
    const deps = createDeps();
    const result = await runPromoteAdmin(deps, {
      ...validOptions,
      reason: "   ",
    });
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("Reason cannot be empty");
  });

  it("returns error for reason over 1000 chars", async () => {
    const deps = createDeps();
    const result = await runPromoteAdmin(deps, {
      ...validOptions,
      reason: "x".repeat(1001),
    });
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("Reason cannot exceed 1000 characters");
  });

  it("returns non-zero when no user matches the phone", async () => {
    const deps = createDeps({
      findUserByPhone: vi.fn().mockResolvedValue(null),
    });
    const result = await runPromoteAdmin(deps, validOptions);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("No user found");
    expect(deps.updateUserRole).not.toHaveBeenCalled();
    expect(deps.createAuditLog).not.toHaveBeenCalled();
  });

  it("returns zero as no-op when user is already admin, without writing audit", async () => {
    const deps = createDeps({
      findUserByPhone: vi.fn().mockResolvedValue({ id: "user-1", role: "admin" }),
    });
    const result = await runPromoteAdmin(deps, validOptions);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain("already admin");
    expect(deps.updateUserRole).not.toHaveBeenCalled();
    expect(deps.createAuditLog).not.toHaveBeenCalled();
  });

  it("dry-run validates but writes nothing", async () => {
    const deps = createDeps({
      findUserByPhone: vi.fn().mockResolvedValue({ id: "user-1", role: "buyer" }),
    });
    const result = await runPromoteAdmin(deps, {
      ...validOptions,
      dryRun: true,
    });
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain("dry-run");
    expect(deps.updateUserRole).not.toHaveBeenCalled();
    expect(deps.createAuditLog).not.toHaveBeenCalled();
  });

  it("promotes user and writes correct audit row on success", async () => {
    let capturedDetails: Record<string, unknown> | undefined;
    const deps = createDeps({
      findUserByPhone: vi.fn().mockResolvedValue({ id: "user-1", role: "buyer" }),
      createAuditLog: vi.fn(async (data) => {
        capturedDetails = data.details as Record<string, unknown>;
      }),
    });
    const result = await runPromoteAdmin(deps, validOptions);
    expect(result.exitCode).toBe(0);
    expect(deps.updateUserRole).toHaveBeenCalledWith("user-1", "admin");
    expect(deps.createAuditLog).toHaveBeenCalledTimes(1);
    expect(deps.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        action: "ADMIN_BOOTSTRAP_PROMOTE",
        targetType: "user",
        targetId: "user-1",
        details: expect.objectContaining({
          reason: "bootstrap first admin",
          before: { role: "buyer" },
          after: { role: "admin" },
        }),
      }),
    );

    expect(capturedDetails).toBeDefined();
    expect(capturedDetails).not.toHaveProperty("phone");
  });

  it("preserves internal line breaks in reason", async () => {
    const deps = createDeps({
      findUserByPhone: vi.fn().mockResolvedValue({ id: "user-1", role: "buyer" }),
    });
    const reason = "Line 1\nLine 2\nLine 3";
    const result = await runPromoteAdmin(deps, { ...validOptions, reason });

    expect(result.exitCode).toBe(0);
    expect(deps.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ reason }),
      }),
    );
  });
});
