const TM_MOBILE_RE = /^\+993[67]\d{7}$/;
const ADMIN_ROLE = "admin";
const ADMIN_BOOTSTRAP_PROMOTE = "ADMIN_BOOTSTRAP_PROMOTE";

export interface PromoteAdminUser {
  id: string;
  role: string;
}

export interface PromoteAdminDeps {
  findUserByPhone(phone: string): Promise<PromoteAdminUser | null>;
  updateUserRole(userId: string, role: string): Promise<void>;
  createAuditLog(data: {
    actorId: null;
    action: string;
    targetType: string;
    targetId: string;
    details: Record<string, unknown>;
  }): Promise<void>;
}

export interface PromoteAdminOptions {
  phone: string;
  reason: string;
  dryRun: boolean;
}

export interface PromoteAdminResult {
  exitCode: number;
  message: string;
}

export async function runPromoteAdmin(
  deps: PromoteAdminDeps,
  options: PromoteAdminOptions,
): Promise<PromoteAdminResult> {
  if (!TM_MOBILE_RE.test(options.phone)) {
    return { exitCode: 1, message: `Invalid phone format: ${options.phone}` };
  }

  const normalizedReason = options.reason.trim();
  if (normalizedReason.length === 0) {
    return { exitCode: 1, message: "Reason cannot be empty" };
  }
  if (normalizedReason.length > 1000) {
    return { exitCode: 1, message: "Reason cannot exceed 1000 characters" };
  }

  const user = await deps.findUserByPhone(options.phone);
  if (!user) {
    return {
      exitCode: 1,
      message: `No user found with phone ${options.phone}`,
    };
  }

  if (user.role === ADMIN_ROLE) {
    return {
      exitCode: 0,
      message: `User ${user.id} is already admin`,
    };
  }

  if (options.dryRun) {
    return {
      exitCode: 0,
      message: `[dry-run] Would promote user ${user.id} to admin (${options.phone})`,
    };
  }

  await deps.updateUserRole(user.id, ADMIN_ROLE);

  await deps.createAuditLog({
    actorId: null,
    action: ADMIN_BOOTSTRAP_PROMOTE,
    targetType: "user",
    targetId: user.id,
    details: {
      reason: normalizedReason,
      before: { role: user.role },
      after: { role: ADMIN_ROLE },
    },
  });

  return {
    exitCode: 0,
    message: `Promoted user ${user.id} to admin (${options.phone})`,
  };
}
