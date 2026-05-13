import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3090),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  GATEWAY_TOKEN: z.string().min(8),
  OTP_DRIVER: z.enum(["mock", "fleet"]).default("mock"),
});

export type Env = z.infer<typeof envSchema>;
