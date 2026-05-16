import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    env: {
      EXPO_PUBLIC_API_URL: "http://localhost:3000/api/v1",
    },
  },
});
