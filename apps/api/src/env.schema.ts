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

  MINIO_ENDPOINT: z.string().default("http://localhost:9000"),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_REGION: z.string().default("us-east-1"),
});

export type Env = z.infer<typeof EnvSchema>;
