import { z } from "zod";

const BaseSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  /**
   * Deployed-environment identity (independent of NODE_ENV): drives
   * fail-closed validation of endpoints and push-transport combinations.
   */
  APP_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
  /** Baked at image build from RAILWAY_GIT_COMMIT_SHA; used in boot logs. */
  AUTOTM_COMMIT_SHA: z.string().min(1).default("unknown"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  MINIO_ENDPOINT: z.string().url(),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),

  PUSH_TRANSPORT: z
    .enum(["test", "fcm-apns", "ntfy"])
    .default("test"),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  APNS_KEY_ID: z.string().optional(),
  APNS_TEAM_ID: z.string().optional(),
  APNS_BUNDLE_ID: z.string().optional(),
  APNS_PRIVATE_KEY: z.string().optional(),
});

type BaseEnv = z.infer<typeof BaseSchema>;

function hostnameOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLoopbackHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "::1" ||
    host === "[::1]" ||
    host === "0.0.0.0" ||
    host.startsWith("127.")
  );
}

function referencesOtherEnvironment(host: string, appEnv: string): boolean {
  if (appEnv === "production") {
    return host.includes("staging");
  }
  if (appEnv === "staging") {
    return (
      host.includes("production") || /(^|[^a-z])prod([-.]|$)/.test(host)
    );
  }
  return false;
}

const DEPLOYED_ENVS = new Set(["staging", "production"]);

const FCM_APNS_REQUIRED_VARS = [
  "FCM_PROJECT_ID",
  "FCM_CLIENT_EMAIL",
  "FCM_PRIVATE_KEY",
  "APNS_KEY_ID",
  "APNS_TEAM_ID",
  "APNS_BUNDLE_ID",
  "APNS_PRIVATE_KEY",
] as const;

function validateEndpoints(env: BaseEnv, add: (path: string, message: string) => void): void {
  if (!DEPLOYED_ENVS.has(env.APP_ENV)) return;

  const endpoints: Array<[string, string]> = [
    ["DATABASE_URL", env.DATABASE_URL],
    ["REDIS_URL", env.REDIS_URL],
    ["MINIO_ENDPOINT", env.MINIO_ENDPOINT],
  ];

  for (const [name, rawUrl] of endpoints) {
    const host = hostnameOf(rawUrl);
    if (host === null) {
      add(name, `${name} must be a valid URL in ${env.APP_ENV}`);
      continue;
    }
    if (isLoopbackHost(host)) {
      add(name, `${name} must not point at a loopback host in ${env.APP_ENV}`);
    }
    if (referencesOtherEnvironment(host, env.APP_ENV)) {
      add(
        name,
        `${name} appears to reference a different environment than APP_ENV=${env.APP_ENV}`,
      );
    }
  }

  if (
    env.MINIO_ACCESS_KEY === "minioadmin" ||
    env.MINIO_SECRET_KEY === "minioadmin"
  ) {
    add("MINIO_ACCESS_KEY", "default MinIO credentials are forbidden outside development");
  }
}

/**
 * Push contract (Sprint 11): the `test` transport records sends in memory and
 * delivers nothing, so it must be impossible to boot production with it. The
 * `fcm-apns` transport is a permanent-failure shell until credentials are
 * complete, so booting with a partial credential set is also forbidden —
 * the worker must fail visibly at boot rather than silently drop pushes.
 */
function validatePushContract(env: BaseEnv, add: (path: string, message: string) => void): void {
  if (env.APP_ENV === "production" && env.PUSH_TRANSPORT === "test") {
    add(
      "PUSH_TRANSPORT",
      "PUSH_TRANSPORT=test delivers nothing and is forbidden in production",
    );
  }

  if (env.PUSH_TRANSPORT === "fcm-apns") {
    for (const name of FCM_APNS_REQUIRED_VARS) {
      const value = env[name];
      if (value === undefined || value.trim() === "") {
        add(
          name,
          `${name} is required when PUSH_TRANSPORT=fcm-apns (incomplete push credentials)`,
        );
      }
    }
  }
}

export const EnvSchema = BaseSchema.superRefine((env, ctx) => {
  const add = (path: string, message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

  validateEndpoints(env, add);
  validatePushContract(env, add);
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid worker environment: ${details}`);
}
