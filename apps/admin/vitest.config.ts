import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    passWithNoTests: true,
    testTimeout: 30_000,
    hookTimeout: 15_000,
  },
});
