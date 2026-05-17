import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    testTimeout: 120_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    setupFiles: ["./test/setup-env.ts", "reflect-metadata"],
  },
});
