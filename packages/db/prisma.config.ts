import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

const envPath = new URL(".env", import.meta.url);
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
