import { resolve } from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/": resolve(__dirname, "./") + "/",
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    // Expo Router turns every non-`+`-prefixed file under app/ into a route, so
    // test files must never live there. Route-level specs go in test/routes/.
    exclude: ["**/node_modules/**", "**/dist/**", "app/**"],
    env: {
      EXPO_PUBLIC_API_URL: "http://localhost:3006/api/v1",
      EXPO_PUBLIC_MEDIA_URL: "https://media.autotm.tm",
    },
  },
});
