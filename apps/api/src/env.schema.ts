import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3006),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  SMS_GATEWAY_URL: z.string().default("http://localhost:3090"),
  SMS_GATEWAY_TOKEN: z.string().default("replace_me_with_random_token"),
  SMS_DRIVER: z.enum(["mock", "test", "gateway"]).default("mock"),

  OTP_TEST_MODE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  RATE_LIMIT_GENERAL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_OTP_PHONE_DAILY: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_OTP_IP_HOURLY: z.coerce.number().int().positive().default(10),

  TOTP_SECRET_ENCRYPTION_KEY: z.string().refine(
    (val) => {
      try {
        return Buffer.from(val, "base64").length === 32;
      } catch {
        return false;
      }
    },
    { message: "TOTP_SECRET_ENCRYPTION_KEY must be a 32-byte base64 string" },
  ),

  SOCKET_IO_NAMESPACE: z.string().default("/ws/chat"),
  SOCKET_IO_CORS_ORIGIN: z.string().default("*"),
  SOCKET_IO_REDIS_ADAPTER_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  MINIO_ENDPOINT: z.string().default("http://localhost:9000"),
  MINIO_PUBLIC_URL: z.string().default("http://localhost:9000"),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_REGION: z.string().default("us-east-1"),

  REPORT_ENTRY_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  ADMIN_MODERATION_ACTIONS_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  INSPECTION_INTEREST_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
});

export type Env = z.infer<typeof EnvSchema>;
