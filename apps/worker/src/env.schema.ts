import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
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

export type Env = z.infer<typeof EnvSchema>;
